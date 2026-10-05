# Hellas Sennaar 2D (Godot 4.7)

Chants-of-Sennaar-style Greek deciphering game, Level 1 «Λιμάνι».
Spec: docs/superpowers/specs/2026-10-05-hellas-sennaar-2d-design.md

- Play from source: `Godot_v4.7.2-stable_win64.exe --path telegram-bot/game2d`
- Tests (headless): `./test.sh` (or `./test.sh test_customs`)
- Play-through with real input events (headless): `./autoplay.sh` → `AUTOPLAY OK`
- Screenshots: `./snap.sh gallery pier pier:notebook conveyor customs:builder end` → `tools/out/`
- Export: `Godot_v4.7.2-stable_win64_console.exe --headless --path . --export-release "Windows Desktop" export/HellasSennaar.exe`
- Save file: `%APPDATA%\Godot\app_userdata\Hellas Sennaar 2D\save.json`
- Controls: click to walk / interact, Tab or N = notebook, Esc / right click = drop the held card.
