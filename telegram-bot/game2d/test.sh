#!/usr/bin/env bash
# Headless unit/integration tests. Usage: ./test.sh [file-prefix ...]
# Fails when any test fails OR when the engine reported a SCRIPT ERROR (runtime errors do not abort tests).
G="${GODOT:-/c/Users/user/Tools/godot/Godot_v4.7.2-stable_win64_console.exe}"
cd "$(dirname "$0")"
"$G" --headless --path . --import >/dev/null 2>&1
out="$("$G" --headless --path . -s res://tests/run_tests.gd -- "$@" 2>&1)"
code=$?
echo "$out"
errors=$(echo "$out" | grep -c "SCRIPT ERROR")
if [ "$errors" -gt 0 ]; then
	echo "!! $errors SCRIPT ERROR(s) during the run"
	exit 1
fi
exit $code
