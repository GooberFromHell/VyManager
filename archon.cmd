@echo off
REM archon — ARCHON Framework CLI
REM The only file you need in your project root.
set "ARCHON_DIR=%~dp0.archon"

if exist "%ARCHON_DIR%\venv\Scripts\python.exe" (
    "%ARCHON_DIR%\venv\Scripts\python.exe" "%ARCHON_DIR%\framework.py" %*
) else if exist "%ARCHON_DIR%\framework.py" (
    python "%ARCHON_DIR%\framework.py" %*
) else (
    python "%~dp0scripts\framework.py" %*
)
