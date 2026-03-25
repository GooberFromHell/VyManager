"""
VyOS Device Provisioning

Auto-provisions VyOS devices via SSH using paramiko. Connects with password
authentication, then runs VyOS's native Python ConfigSession API on the device
to configure HTTPS API, REST, GraphQL, and SSH key authentication.

Uses exec_command with a Python script that prints step markers to stdout,
allowing real-time progress streaming.
"""

import logging
import re
import secrets
import shlex
import time
from dataclasses import dataclass, field
from typing import Generator

import paramiko

from ssh_key_manager import generate_keypair

logger = logging.getLogger(__name__)

_STEP_PREFIX = "VYMANAGER_STEP:"
_SUCCESS_MARKER = "VYMANAGER_PROVISION_OK"
_ERROR_PREFIX = "VYMANAGER_ERROR:"


# ============================================================================
# Data classes
# ============================================================================


@dataclass
class ProvisioningEvent:
    """A single step event emitted during provisioning."""

    step: str
    status: str  # "running" | "complete" | "failed"
    message: str
    detail: str | None = None
    data: dict | None = None


@dataclass
class ProvisioningResult:
    """Captures the outcome of a provisioning attempt."""

    success: bool
    ssh_connected: bool
    api_key_configured: bool
    ssh_key_configured: bool
    committed: bool
    saved: bool
    api_key: str | None = None
    ssh_public_key: str | None = None
    ssh_encrypted_private_key: str | None = None
    ssh_key_nonce: str | None = None
    vyos_version: str | None = None
    error: str | None = None
    step_errors: dict = field(default_factory=dict)


# ============================================================================
# Helpers
# ============================================================================


def _detect_version(output: str) -> str:
    """Parse VyOS version from 'show version' output."""
    match = re.search(r"VyOS\s+(1\.\d+)", output)
    if match:
        version = match.group(1)
        if version.startswith("1.4"):
            return "1.4"
        if version.startswith("1.5"):
            return "1.5"
        if version.startswith("1.3"):
            return "1.4"
    return "1.5"


def _build_configure_script(
    api_key: str,
    ssh_username: str,
    pubkey_base64: str,
) -> str:
    """Build a Python script that runs on the VyOS device via ConfigSession.

    The script prints step markers to stdout so the caller can track progress.
    All values are safely interpolated using repr().
    """
    return (
        "import os, sys\n"
        "try:\n"
        "    from vyos.configsession import ConfigSession\n"
        "except ImportError:\n"
        f"    print({repr(_ERROR_PREFIX)}+'ConfigSession not available - is this a VyOS device?')\n"
        "    sys.exit(1)\n"
        "\n"
        "try:\n"
        "    c = ConfigSession(os.getpid())\n"
        f"    print({repr(_STEP_PREFIX)}+'configuring')\n"
        "\n"
        f"    print({repr(_STEP_PREFIX)}+'enabling_https')\n"
        "    c.set(['service', 'https', 'listen-address', '0.0.0.0'])\n"
        "\n"
        f"    print({repr(_STEP_PREFIX)}+'configuring_api_key')\n"
        f"    c.set(['service', 'https', 'api', 'keys', 'id', 'vymanager', 'key', {repr(api_key)}])\n"
        "\n"
        f"    print({repr(_STEP_PREFIX)}+'enabling_rest_api')\n"
        "    c.set(['service', 'https', 'api', 'rest'])\n"
        "\n"
        f"    print({repr(_STEP_PREFIX)}+'enabling_graphql')\n"
        "    c.set(['service', 'https', 'api', 'graphql'])\n"
        "\n"
        f"    print({repr(_STEP_PREFIX)}+'configuring_ssh_key')\n"
        f"    c.set(['system', 'login', 'user', {repr(ssh_username)}, 'authentication', 'public-keys', 'vymanager', 'type', 'ssh-ed25519'])\n"
        f"    c.set(['system', 'login', 'user', {repr(ssh_username)}, 'authentication', 'public-keys', 'vymanager', 'key', {repr(pubkey_base64)}])\n"
        "\n"
        f"    print({repr(_STEP_PREFIX)}+'committing')\n"
        "    c.commit()\n"
        "\n"
        f"    print({repr(_STEP_PREFIX)}+'saving')\n"
        "    c.save_config('/config/config.boot')\n"
        "\n"
        f"    print({repr(_SUCCESS_MARKER)})\n"
        "except Exception as e:\n"
        f"    print({repr(_ERROR_PREFIX)}+str(e))\n"
        "    sys.exit(1)\n"
    )


# Step ID → human-readable messages
_STEP_MESSAGES = {
    "configuring": ("Entering configuration mode", "Configuration mode entered"),
    "enabling_https": ("Enabling HTTPS API on all interfaces...", "HTTPS API enabled on 0.0.0.0"),
    "configuring_api_key": ("Configuring API key...", "API key configured"),
    "enabling_rest_api": ("Enabling REST API...", "REST API enabled"),
    "enabling_graphql": ("Enabling GraphQL...", "GraphQL enabled"),
    "configuring_ssh_key": ("Configuring SSH key authentication...", "SSH key authentication configured"),
    "committing": ("Committing configuration changes...", "Configuration committed"),
    "saving": ("Saving configuration...", "Configuration saved"),
}


# ============================================================================
# Main provisioning generator
# ============================================================================


def provision_vyos_device_stream(
    host: str,
    ssh_port: int,
    ssh_username: str,
    ssh_password: str,
    timeout: int = 30,
) -> Generator[ProvisioningEvent, None, None]:
    """Provision a VyOS device, yielding status events for each step.

    This is a synchronous generator. Run it in a thread for async contexts.
    The final event (step="complete") includes a ``data`` dict with generated
    credentials that the caller should persist.

    Approach: SSH in with paramiko, run VyOS's native Python ConfigSession API
    via ``sudo python3 -c <script>``. The script prints step markers to stdout
    which we read line-by-line for real-time progress.
    """
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        # ── Step 1: SSH connect ──────────────────────────────────
        yield ProvisioningEvent(
            step="connecting",
            status="running",
            message="Connecting to router via SSH...",
        )
        try:
            client.connect(
                hostname=host,
                port=ssh_port,
                username=ssh_username,
                password=ssh_password,
                timeout=timeout,
                look_for_keys=False,
                allow_agent=False,
            )
        except paramiko.AuthenticationException:
            yield ProvisioningEvent(
                step="connecting",
                status="failed",
                message="SSH authentication failed — check username and password",
            )
            return
        except Exception as exc:
            yield ProvisioningEvent(
                step="connecting",
                status="failed",
                message=f"SSH connection failed: {exc}",
            )
            return

        yield ProvisioningEvent(
            step="connecting",
            status="complete",
            message="SSH connection established",
        )

        # ── Step 2: Detect VyOS version ──────────────────────────
        yield ProvisioningEvent(
            step="detecting_version",
            status="running",
            message="Detecting VyOS version...",
        )
        try:
            _stdin, _stdout, _stderr = client.exec_command(
                "show version", timeout=timeout
            )
            version_output = _stdout.read().decode("utf-8", errors="replace")
            vyos_version = _detect_version(version_output)
        except Exception as exc:
            yield ProvisioningEvent(
                step="detecting_version",
                status="failed",
                message=f"Failed to detect VyOS version: {exc}",
            )
            return

        yield ProvisioningEvent(
            step="detecting_version",
            status="complete",
            message=f"Detected VyOS {vyos_version}",
            data={"vyos_version": vyos_version},
        )

        # ── Step 3: Generate credentials ─────────────────────────
        yield ProvisioningEvent(
            step="generating_credentials",
            status="running",
            message="Generating API key and SSH keypair...",
        )
        api_key = secrets.token_urlsafe(32)
        try:
            keypair = generate_keypair()
        except ValueError as exc:
            yield ProvisioningEvent(
                step="generating_credentials",
                status="failed",
                message=f"Keypair generation failed: {exc}",
                detail="Check that SSH_ENCRYPTION_KEY is set in the backend environment",
            )
            return

        public_key_str: str = keypair["public_key"]
        encrypted_private_key: str = keypair["encrypted_private_key"]
        key_nonce: str = keypair["nonce"]
        pubkey_base64 = public_key_str.split()[1]

        yield ProvisioningEvent(
            step="generating_credentials",
            status="complete",
            message="API key and SSH keypair generated",
        )

        # ── Steps 4-11: Configure via VyOS ConfigSession API ────
        # Build the Python script that will run ON the VyOS device
        py_script = _build_configure_script(
            api_key=api_key,
            ssh_username=ssh_username,
            pubkey_base64=pubkey_base64,
        )
        command = f"sudo python3 -c {shlex.quote(py_script)}"

        logger.info("Running provisioning script on %s:%d", host, ssh_port)

        try:
            _stdin, _stdout, _stderr = client.exec_command(command, timeout=90)
        except Exception as exc:
            yield ProvisioningEvent(
                step="configuring",
                status="failed",
                message=f"Failed to execute provisioning script: {exc}",
            )
            return

        # Read stdout line-by-line, yielding events as step markers appear
        current_step: str | None = None
        provision_ok = False

        for raw_line in _stdout:
            line = raw_line.strip()
            if not line:
                continue

            if line.startswith(_STEP_PREFIX):
                step_id = line[len(_STEP_PREFIX):]

                # Complete the previous step
                if current_step and current_step in _STEP_MESSAGES:
                    _, done_msg = _STEP_MESSAGES[current_step]
                    yield ProvisioningEvent(
                        step=current_step,
                        status="complete",
                        message=done_msg,
                    )

                current_step = step_id

                # Emit "running" for the new step
                if step_id in _STEP_MESSAGES:
                    running_msg, _ = _STEP_MESSAGES[step_id]
                    yield ProvisioningEvent(
                        step=step_id,
                        status="running",
                        message=running_msg,
                    )

            elif line == _SUCCESS_MARKER:
                # Complete the last step
                if current_step and current_step in _STEP_MESSAGES:
                    _, done_msg = _STEP_MESSAGES[current_step]
                    yield ProvisioningEvent(
                        step=current_step,
                        status="complete",
                        message=done_msg,
                    )
                provision_ok = True

            elif line.startswith(_ERROR_PREFIX):
                error_msg = line[len(_ERROR_PREFIX):]
                yield ProvisioningEvent(
                    step=current_step or "configuring",
                    status="failed",
                    message=f"Configuration failed: {error_msg}",
                )
                return

        # Check stderr and exit status
        exit_status = _stdout.channel.recv_exit_status()
        stderr_output = _stderr.read().decode("utf-8", errors="replace").strip()

        if not provision_ok:
            detail = stderr_output[:300] if stderr_output else None
            yield ProvisioningEvent(
                step=current_step or "configuring",
                status="failed",
                message=f"Provisioning script failed (exit code {exit_status})",
                detail=detail,
            )
            return

        # ── Step 12: Verify API connectivity ─────────────────────
        yield ProvisioningEvent(
            step="verifying",
            status="running",
            message="Waiting for HTTPS API to become available...",
        )
        import requests as _requests

        api_url = f"https://{host}:443/retrieve"
        api_reachable = False
        for _attempt in range(15):
            try:
                resp = _requests.post(
                    api_url,
                    json={"op": "showConfig", "path": [], "key": api_key},
                    verify=False,
                    timeout=3,
                )
                if resp.status_code == 200:
                    api_reachable = True
                    break
            except Exception:
                pass
            time.sleep(1)

        if api_reachable:
            yield ProvisioningEvent(
                step="verifying",
                status="complete",
                message="HTTPS API is reachable and responding",
            )
        else:
            yield ProvisioningEvent(
                step="verifying",
                status="complete",
                message="Configuration saved — API may take a moment to start",
                detail="If you cannot connect immediately, wait 30 seconds and try again",
            )

        # ── Final: Complete ──────────────────────────────────────
        yield ProvisioningEvent(
            step="complete",
            status="complete",
            message="Router onboarding complete",
            data={
                "api_key": api_key,
                "ssh_public_key": public_key_str,
                "ssh_encrypted_private_key": encrypted_private_key,
                "ssh_key_nonce": key_nonce,
                "vyos_version": vyos_version,
            },
        )

    except Exception as exc:
        logger.exception("Unexpected error during provisioning: host=%s", host)
        yield ProvisioningEvent(
            step="error",
            status="failed",
            message=f"Unexpected error: {exc}",
        )

    finally:
        try:
            client.close()
        except Exception:
            pass


# ============================================================================
# Async wrapper (backward compatibility)
# ============================================================================


async def provision_vyos_device(
    host: str,
    ssh_port: int,
    ssh_username: str,
    ssh_password: str,
    vyos_username: str,
    api_key_name: str = "vymanager",
    ssh_key_name: str = "vymanager",
    timeout: int = 30,
) -> ProvisioningResult:
    """Non-streaming provisioning for backward compatibility."""
    import asyncio

    def _run() -> ProvisioningResult:
        final_data: dict | None = None
        last_failed: ProvisioningEvent | None = None
        ssh_connected = False

        for event in provision_vyos_device_stream(
            host=host,
            ssh_port=ssh_port,
            ssh_username=ssh_username,
            ssh_password=ssh_password,
            timeout=timeout,
        ):
            if event.step == "connecting" and event.status == "complete":
                ssh_connected = True
            if event.status == "failed":
                last_failed = event
            if event.step == "complete" and event.status == "complete" and event.data:
                final_data = event.data

        if final_data:
            return ProvisioningResult(
                success=True,
                ssh_connected=True,
                api_key_configured=True,
                ssh_key_configured=True,
                committed=True,
                saved=True,
                api_key=final_data.get("api_key"),
                ssh_public_key=final_data.get("ssh_public_key"),
                ssh_encrypted_private_key=final_data.get("ssh_encrypted_private_key"),
                ssh_key_nonce=final_data.get("ssh_key_nonce"),
                vyos_version=final_data.get("vyos_version"),
            )

        return ProvisioningResult(
            success=False,
            ssh_connected=ssh_connected,
            api_key_configured=False,
            ssh_key_configured=False,
            committed=False,
            saved=False,
            error=last_failed.message if last_failed else "Provisioning failed",
        )

    return await asyncio.to_thread(_run)
