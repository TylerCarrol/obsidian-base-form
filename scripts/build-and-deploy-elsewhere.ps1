param(
    [Parameter(Mandatory = $true, ValueFromRemainingArguments = $true)]
    [string[]]$DestinationPluginFolders
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Path $PSScriptRoot -Parent
$manifest = Get-Content -Path (Join-Path -Path $repoRoot -ChildPath 'manifest.json') -Raw | ConvertFrom-Json
$pluginId = $manifest.id
$pluginFiles = @(
    'main.js',
    'manifest.json'
)

if (Test-Path -Path (Join-Path -Path $repoRoot -ChildPath 'styles.css')) {
    $pluginFiles += 'styles.css'
}

Push-Location $repoRoot
try {
    Write-Host 'Installing plugin dependencies...' -ForegroundColor Cyan
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed with exit code $LASTEXITCODE"
    }

    Write-Host 'Building plugin...' -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

foreach ($destinationPluginFolder in $DestinationPluginFolders) {
    if ([string]::IsNullOrWhiteSpace($destinationPluginFolder)) {
        continue
    }

    $pluginDir = Join-Path -Path $destinationPluginFolder -ChildPath $pluginId
    if (-not (Test-Path -Path $pluginDir)) {
        New-Item -Path $pluginDir -ItemType Directory -Force | Out-Null
    }

    Write-Host "Copying plugin files to $pluginDir..." -ForegroundColor Cyan
    foreach ($pluginFile in $pluginFiles) {
        Copy-Item -Path (Join-Path -Path $repoRoot -ChildPath $pluginFile) -Destination $pluginDir -Force
    }
}

Write-Host 'Plugin compiled and copied to destination plugin folder(s):' -ForegroundColor Green
foreach ($destinationPluginFolder in $DestinationPluginFolders) {
    if (-not [string]::IsNullOrWhiteSpace($destinationPluginFolder)) {
        Write-Host (Join-Path -Path $destinationPluginFolder -ChildPath $pluginId)
    }
}