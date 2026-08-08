param(
    [Parameter(Mandatory = $true)]
    [string]$ShortcutPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -Path $ShortcutPath)) {
    throw "Vault shortcut file not found: $ShortcutPath"
}

$urlLine = Get-Content -Path $ShortcutPath | Where-Object { $_ -like 'URL=*' } | Select-Object -First 1
if (-not $urlLine) {
    throw "No URL entry found in shortcut file: $ShortcutPath"
}

$rawUrl = $urlLine.Substring(4)
$uri = [Uri]$rawUrl

$vaultParam = ($uri.Query.TrimStart('?') -split '&' | Where-Object { $_ -like 'vault=*' } | Select-Object -First 1)
$vaultName = if ($vaultParam) {
    [Uri]::UnescapeDataString(($vaultParam -replace '^vault=', ''))
}
else {
    $null
}

if ([string]::IsNullOrWhiteSpace($vaultName)) {
    throw "Could not parse vault name from URL: $rawUrl"
}

return $vaultName