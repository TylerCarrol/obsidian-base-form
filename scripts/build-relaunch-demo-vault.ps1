Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Ensure-User32Interop {
    if (-not ('Win32.NativeMethods' -as [type])) {
        Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;

namespace Win32 {
    public static class NativeMethods {
        public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        [DllImport("user32.dll", SetLastError=true)]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll", SetLastError=true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll", SetLastError=true)]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll", SetLastError=true)]
        public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    }
}
"@
    }
}

function Get-ObsidianVaultWindows {
    param(
        [Parameter(Mandatory = $true)]
        [string]$VaultName
    )

    Ensure-User32Interop

    $foundWindows = New-Object 'System.Collections.Generic.List[object]'
    $escapedVault = [Regex]::Escape($VaultName)

    $callback = [Win32.NativeMethods+EnumWindowsProc]{
        param([IntPtr]$hWnd, [IntPtr]$lParam)

        if (-not [Win32.NativeMethods]::IsWindowVisible($hWnd)) {
            return $true
        }

        $processId = 0
        [void][Win32.NativeMethods]::GetWindowThreadProcessId($hWnd, [ref]$processId)
        if ($processId -eq 0) {
            return $true
        }

        try {
            $proc = Get-Process -Id $processId -ErrorAction Stop
        }
        catch {
            return $true
        }

        if ($proc.ProcessName -ne 'Obsidian') {
            return $true
        }

        $titleBuilder = New-Object System.Text.StringBuilder 1024
        [void][Win32.NativeMethods]::GetWindowText($hWnd, $titleBuilder, $titleBuilder.Capacity)
        $title = $titleBuilder.ToString()

        if ([string]::IsNullOrWhiteSpace($title)) {
            return $true
        }

        if ($title -match "(?i)(^| - )$escapedVault( - |$)") {
            $foundWindows.Add([pscustomobject]@{
                Handle = $hWnd
                ProcessId = $processId
                Title = $title
            })
        }

        return $true
    }

    [void][Win32.NativeMethods]::EnumWindows($callback, [IntPtr]::Zero)
    return $foundWindows
}

function Close-ObsidianVaultWindows {
    param(
        [Parameter(Mandatory = $true)]
        [string]$VaultName,

        [int]$TimeoutSeconds = 10
    )

    $windows = @(Get-ObsidianVaultWindows -VaultName $VaultName)
    if ($windows.Count -eq 0) {
        Write-Host "No open Obsidian windows found for vault '$VaultName'." -ForegroundColor Yellow
        return
    }

    Write-Host "Closing $($windows.Count) Obsidian window(s) for vault '$VaultName'..." -ForegroundColor Cyan
    foreach ($win in $windows) {
        [void][Win32.NativeMethods]::PostMessage($win.Handle, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
    }

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        Start-Sleep -Milliseconds 300
        $remaining = @(Get-ObsidianVaultWindows -VaultName $VaultName)
    } while ($remaining.Count -gt 0 -and (Get-Date) -lt $deadline)

    if ($remaining.Count -gt 0) {
        Write-Host "Some windows for '$VaultName' are still open (possible prompt/dialog)." -ForegroundColor Yellow
    }
    else {
        Write-Host "Closed Obsidian window(s) for vault '$VaultName'." -ForegroundColor Green
    }
}

$repoRoot = Split-Path -Path $PSScriptRoot -Parent
$shortcutPath = Join-Path -Path $repoRoot -ChildPath 'Demo Vault.url'
$vaultNameScript = Join-Path -Path $PSScriptRoot -ChildPath 'get-vault-name-from-shortcut.ps1'

Write-Host 'Running build-to-demo-vault script...' -ForegroundColor Cyan
& (Join-Path -Path $PSScriptRoot -ChildPath 'build-to-demo-vault.ps1')
if ($LASTEXITCODE -ne 0) {
    throw "build-to-demo-vault.ps1 failed with exit code $LASTEXITCODE"
}

$vaultName = & $vaultNameScript -ShortcutPath $shortcutPath
Close-ObsidianVaultWindows -VaultName $vaultName

Write-Host "Relaunching vault '$vaultName'..." -ForegroundColor Cyan
Start-Process -FilePath 'explorer.exe' -ArgumentList @($shortcutPath) | Out-Null

Write-Host 'Done.' -ForegroundColor Green
return