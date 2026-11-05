# Keeps the Overplanner server running; started by the scheduled task from
# install-autostart.ps1. Restarts the server if it exits, waiting a little
# longer each time it fails quickly.
param([string]$Node = "node")

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$log = Join-Path $root "logs\server.log"
$delay = 5

while ($true) {
  $started = Get-Date
  "=== $started starting ===" | Out-File $log -Append -Encoding utf8
  # Plain UTF-8 lines: redirecting with *>> would write UTF-16 in Windows PowerShell.
  & $Node "node_modules\tsx\dist\cli.mjs" "server/index.ts" 2>&1 | ForEach-Object { "$_" } | Out-File $log -Append -Encoding utf8
  "=== $(Get-Date) exited with code $LASTEXITCODE ===" | Out-File $log -Append -Encoding utf8

  # Ran for a while: that was a one-off, so retry quickly.
  if (((Get-Date) - $started).TotalMinutes -gt 5) { $delay = 5 } else { $delay = [Math]::Min($delay * 2, 300) }
  Start-Sleep -Seconds $delay
}
