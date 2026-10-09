#!/usr/bin/env bash
set -euo pipefail
exec python3 -B -m unittest discover -s "$(dirname "$0")" -p test_generate_svg_symbols.py
