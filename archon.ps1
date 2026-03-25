# archon — ARCHON Framework CLI
# The only file you need in your project root.
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ArchonDir = Join-Path $ScriptDir ".archon"
$VenvPython = Join-Path $ArchonDir "venv\Scripts\python.exe"
$ArchonCli = Join-Path $ArchonDir "framework.py"
$SourceCli = Join-Path $ScriptDir "scripts\framework.py"

if (Test-Path $VenvPython) {
    & $VenvPython $ArchonCli @args
} elseif (Test-Path $ArchonCli) {
    & python $ArchonCli @args
} else {
    & python $SourceCli @args
}
