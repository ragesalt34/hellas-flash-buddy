@echo off
rem Launch Hellas Sennaar 2D from source (Godot 4.7.2). The import step picks up new art in assets/art.
set GODOT=C:\Users\user\Tools\godot
"%GODOT%\Godot_v4.7.2-stable_win64_console.exe" --headless --path "%~dp0." --import >nul 2>&1
start "" "%GODOT%\Godot_v4.7.2-stable_win64.exe" --path "%~dp0."
