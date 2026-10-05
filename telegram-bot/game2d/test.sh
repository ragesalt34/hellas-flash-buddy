#!/usr/bin/env bash
# Headless unit/integration tests. Usage: ./test.sh [file-prefix ...]
G="${GODOT:-/c/Users/user/Tools/godot/Godot_v4.7.2-stable_win64_console.exe}"
cd "$(dirname "$0")"
"$G" --headless --path . --import >/dev/null 2>&1
"$G" --headless --path . -s res://tests/run_tests.gd -- "$@"
