@echo off
REM Pakwone REA - setup and update on Windows. Double-click to run.
setlocal
cd /d "%~dp0"
echo Checking Node.js (needs 22.23.4+, 24.22.1+ or 26.12.1+)...
node --version || (echo Node.js not found. Install the current LTS from https://nodejs.org & goto fail)
if exist .git (
  where git >nul 2>nul && (
    echo Getting the latest Pakwone REA from GitHub...
    git pull --ff-only || echo Could not update from GitHub; continuing with the current version.
  )
)
set HUSKY=0
echo Installing dependencies...
call npm ci --no-audit --no-fund || (echo If npm mentioned "engine" or "Unsupported engine", update Node.js from https://nodejs.org & goto fail)
echo Building Pakwone REA...
call npm run build || goto fail
echo Connecting the REA server for Claude Code in this folder...
set "ROOT=%~dp0"
set "ROOT=%ROOT:\=/%"
> .mcp.json echo {"mcpServers":{"rea":{"command":"node","args":["%ROOT%scripts/rea.mjs","mcp"]}}}
echo.
node scripts\rea.mjs --version || goto fail
echo.
echo Pakwone REA is ready. Open this folder in Claude Code and run /feature-teardown.
pause
exit /b 0
:fail
echo.
echo Setup failed. Copy the messages above and send them to Claude.
pause
exit /b 1
