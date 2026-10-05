#!/usr/bin/env bash
# Plays Level 1 start to end with real input events (headless). Fails on any FAIL or SCRIPT ERROR.
G="${GODOT:-/c/Users/user/Tools/godot/Godot_v4.7.2-stable_win64_console.exe}"
cd "$(dirname "$0")"
"$G" --headless --path . --import >/dev/null 2>&1
out="$("$G" --headless --path . -s res://tools/autoplay.gd 2>&1)"
code=$?
echo "$out" | grep -E "^  (ok|FAIL)|AUTOPLAY|SCRIPT ERROR|   at: "
if echo "$out" | grep -q "SCRIPT ERROR"; then
	echo "!! SCRIPT ERROR during autoplay"
	exit 1
fi
exit $code
