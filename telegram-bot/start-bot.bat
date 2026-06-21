@echo off
title Hellas Flash Buddy Bot
echo Starting Hellas Flash Buddy Bot...
echo.

:: Add Cursor's Node.js to PATH so tsx.cmd can find it
set PATH=C:\Users\user\AppData\Local\Programs\cursor\resources\app\resources\helpers;%PATH%

:: Go to bot directory
cd /d "%~dp0"

:: Run bot with tsx (TypeScript, no build needed)
node_modules\.bin\tsx.cmd src\index.ts

echo.
echo Bot stopped.
pause
