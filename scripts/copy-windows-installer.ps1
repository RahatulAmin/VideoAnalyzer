$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$bundleDirectory = Join-Path $projectRoot 'src-tauri\target\release\bundle\nsis'
$destinationDirectory = Join-Path $projectRoot 'windows installer'
$installer = Get-ChildItem -LiteralPath $bundleDirectory -Filter '*_x64-setup.exe' -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $installer) {
    throw "No Windows installer was found in $bundleDirectory"
}

New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
Copy-Item -LiteralPath $installer.FullName -Destination $destinationDirectory -Force
Write-Host "Copied installer to $destinationDirectory"
