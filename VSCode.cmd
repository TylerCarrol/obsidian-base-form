@echo off
setlocal

REM Resolve this script's directory as the repo root.
set "REPO_DIR=%~dp0"
if "%REPO_DIR:~-1%"=="\" set "REPO_DIR=%REPO_DIR:~0,-1%"

REM Prefer a resolved Code.exe from PATH entries (including code.cmd wrappers).
set "CODE_EXE="
for /f "usebackq delims=" %%I in (`where code 2^>nul`) do (
    if /I "%%~xI"==".exe" (
        set "CODE_EXE=%%~fI"
        goto :launch
    )
    if /I "%%~xI"==".cmd" (
        if exist "%%~dpI..\Code.exe" (
            set "CODE_EXE=%%~dpI..\Code.exe"
            goto :launch
        )
    )
)

REM Fallback to common Windows install locations.
for %%I in (
    "%LocalAppData%\Programs\Microsoft VS Code\Code.exe"
    "%ProgramFiles%\Microsoft VS Code\Code.exe"
    "%ProgramFiles(x86)%\Microsoft VS Code\Code.exe"
) do (
    if exist %%~I (
        set "CODE_EXE=%%~I"
        goto :launch
    )
)

:launch
if defined CODE_EXE (
    powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Start-Process -FilePath $env:CODE_EXE -WorkingDirectory $env:REPO_DIR -ArgumentList @('-n', $env:REPO_DIR)"
    if errorlevel 1 (
        echo Failed to launch VS Code from "%CODE_EXE%".
        exit /b 1
    )
    exit /b 0
)

echo Could not find VS Code. Install it or add the ^"code^" command to PATH.
echo In VS Code: press Ctrl+Shift+P and run ^"Shell Command: Install 'code' command in PATH^".
exit /b 1
