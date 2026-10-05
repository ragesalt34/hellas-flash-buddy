#!/usr/bin/env bash
# Off-screen 1920x1080 renders into tools/out/. Usage: ./snap.sh gallery pier pier:notebook
G="${GODOT:-/c/Users/user/Tools/godot/Godot_v4.7.2-stable_win64_console.exe}"
cd "$(dirname "$0")"
"$G" --headless --path . --import >/dev/null 2>&1
"$G" --path . -s res://tools/snapshot.gd -- "$@"
