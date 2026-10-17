@echo off
cd /d "%~dp0"
echo Classroom Studio - http://127.0.0.1:4320
echo Keep this window open while using the app. Press Ctrl+C to stop.
where node >nul 2>nul
if %errorlevel% equ 0 (
  node server.cjs
) else (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.cjs
  ) else (
    echo Node.js was not found. Install Node.js, then run this file again.
  )
)
pause
