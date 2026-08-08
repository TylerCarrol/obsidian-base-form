$repoRoot = Split-Path -Path $PSScriptRoot -Parent
Write-Host 'Pulling latest changes from git...' -ForegroundColor Cyan
Push-Location $repoRoot
try {
    git --no-pager pull --ff-only
    if ($LASTEXITCODE -ne 0) {
        throw "git pull failed with exit code $LASTEXITCODE"
    }

    & (Join-Path -Path $PSScriptRoot -ChildPath 'build-relaunch-demo-vault.ps1')
    if ($LASTEXITCODE -ne 0) {
        throw "build-relaunch-demo-vault.ps1 failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}