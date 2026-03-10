# VyManager — VyOS Container Installation Guide

Deploy VyManager (PostgreSQL + FastAPI backend + Next.js frontend) as native VyOS containers managed via the VyOS CLI.

## Quick Start (Online)

If the VyOS router has internet access:

```bash
# Transfer the install script to the router
scp container/vyos_install.sh vyos@<ROUTER_IP>:/tmp/vyos_install.sh

# SSH into the router and run
ssh vyos@<ROUTER_IP>
cd /tmp && sudo bash vyos_install.sh
```

## Offline / Air-Gapped Installation

For routers without internet access, use the bundler to prepare images on a dev machine first.

### Step 1: Bundle images (dev machine)

Requires Docker and internet access:

```bash
./container/vyos_bundle.sh [output_dir]
# Default output: ./vymanager-bundle/
```

This pulls all three images, saves them as `.tar` files, and copies `vyos_install.sh` into the bundle directory.

### Step 2: Transfer to router

```bash
scp -r ./vymanager-bundle vyos@<ROUTER_IP>:/tmp/vymanager-bundle
```

### Step 3: Install on router

```bash
ssh vyos@<ROUTER_IP>
cd /tmp/vymanager-bundle && sudo bash vyos_install.sh
```

The installer detects tarballs in its directory and loads them via `podman load` instead of pulling from registries.

## Configuration

Edit the variables at the top of `vyos_install.sh` before running:

| Variable | Default | Description |
|----------|---------|-------------|
| `ROUTER_IP` | `172.16.100.2` | Router IP for access URLs |
| `FRONTEND_PORT` | `3001` | Host port for the frontend (container uses 3000) |
| `BACKEND_PORT` | `8000` | Host port for the backend API |
| `POSTGRES_PORT` | `5432` | Host port for PostgreSQL |
| `DB_USER` | `vymanager` | PostgreSQL username |
| `DB_PASS` | `vymanager` | PostgreSQL password |
| `DB_NAME` | `vymanager_auth` | PostgreSQL database name |
| `CONTAINER_NETWORK` | `vymgr-net` | VyOS container network name |
| `CONTAINER_NETWORK_PREFIX` | `172.18.200.0/24` | Container network subnet |

### Secrets

`BETTER_AUTH_SECRET` and `SSH_ENCRYPTION_KEY` are auto-generated on first run. To provide your own, export them before running:

```bash
export BETTER_AUTH_SECRET="your-secret-here"
export SSH_ENCRYPTION_KEY="your-hex-key-here"
sudo -E bash vyos_install.sh
```

## Port Mapping

| Container | Host Port | Container Port | Notes |
|-----------|-----------|----------------|-------|
| vymanager-postgres | 5432 | 5432 | |
| vymanager-backend | 8000 | 8000 | |
| vymanager-frontend | 3001 | 3000 | Port 3000 reserved for Grafana |

## What the Installer Does

1. **Cleanup** — Removes any existing VyManager container configuration
2. **Prerequisites** — Creates `/config/vymanager/postgres_data` (persists across VyOS upgrades) and loads/pulls container images
3. **Configure** — Sets up the container network and all three containers with environment variables via VyOS CLI `set container` commands
4. **Commit & Save** — Commits and saves the VyOS configuration

All configuration is visible via `show configuration commands | match vymanager`.

## Troubleshooting

```bash
# Check container status
sudo podman ps --filter "name=vymanager"

# View logs
sudo podman logs vymanager-postgres
sudo podman logs vymanager-backend
sudo podman logs vymanager-frontend

# Verify VyOS config
show container
show configuration commands | match vymanager

# Restart a container
sudo podman restart vymanager-backend
```

The frontend runs Prisma database migrations on first boot — allow 30-60 seconds for initial startup.
