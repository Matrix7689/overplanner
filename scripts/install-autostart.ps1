# Runs Overplanner whenever you sign in to Windows, in the background, and
# restarts it if it crashes. Run once:
#   powershell -ExecutionPolicy Bypass -File scripts\install-autostart.ps1
# To undo:
#   Unregister-ScheduledTask -TaskName Overplanner -Confirm:$false
#
# It registers a task for your user only and needs no administrator rights.

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = "$env:ProgramFiles\nodejs\node.exe" }
if (-not (Test-Path $node)) { throw "Node.js not found. Install it first." }
if (-not (Test-Path "$root\dist\index.html")) { throw "No build found. Run 'npm run build' first." }

New-Item -ItemType Directory -Force "$root\logs" | Out-Null

# A hidden window that restarts the server if it exits, with output in logs\.
$runner = "$root\scripts\run-server.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runner`" -Node `"$node`"" `
  -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName "Overplanner" -Action $action -Trigger $trigger -Settings $settings `
  -Description "Overplanner server (http://127.0.0.1:3030)" -Force | Out-Null
Start-ScheduledTask -TaskName "Overplanner"

Write-Host "Overplanner will start when you sign in, and is starting now."
Write-Host "Open http://localhost:3030 (logs are in $root\logs)."
