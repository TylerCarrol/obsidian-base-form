$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Path $PSScriptRoot -Parent
$manifest = Get-Content -Path (Join-Path -Path $repoRoot -ChildPath 'manifest.json') -Raw | ConvertFrom-Json
$pluginId = $manifest.id
$pluginDir = Join-Path -Path $repoRoot -ChildPath "$pluginId-demo-vault\.obsidian\plugins\$pluginId"
if (-not (Test-Path -Path $pluginDir)) {
    New-Item -Path $pluginDir -ItemType Directory | Out-Null
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

Write-Host 'Copying plugin files to test vault...' -ForegroundColor Cyan
Copy-Item -Path (Join-Path -Path $repoRoot -ChildPath 'main.js') -Destination $pluginDir -Force
Copy-Item -Path (Join-Path -Path $repoRoot -ChildPath 'manifest.json') -Destination $pluginDir -Force
if (Test-Path -Path (Join-Path -Path $repoRoot -ChildPath 'styles.css')) {
    Copy-Item -Path (Join-Path -Path $repoRoot -ChildPath 'styles.css') -Destination $pluginDir -Force
}

Write-Host 'Plugin compiled and copied to test vault:' -ForegroundColor Green
Write-Host $pluginDir