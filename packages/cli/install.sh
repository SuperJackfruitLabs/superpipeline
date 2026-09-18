#!/bin/sh
# Put `supi` and `superpipeline` on PATH, pointing at this checkout.
set -eu

CLI_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ENTRYPOINT="$CLI_DIR/src/index.ts"
BIN_DIR="${BIN_DIR:-$HOME/.local/bin}"
NAMES="supi superpipeline"

# Ours means: a symlink already pointing where we are about to point. Anything else in the way
# belongs to someone, and is never this installer's to replace.
ours() {
	[ -L "$1" ] && [ "$(readlink "$1")" = "$ENTRYPOINT" ]
}

if [ "${1:-}" = "--uninstall" ]; then
	for name in $NAMES; do
		# Only ever our own link: an uninstall that removed a stranger's program would be a
		# worse failure than leaving ours behind.
		ours "$BIN_DIR/$name" && rm -f "$BIN_DIR/$name"
	done
	exit 0
fi

# Checked here rather than left to the first invocation: the entrypoint's shebang is
# `#!/usr/bin/env bun`, and without it the installed command fails with `bad interpreter`, which
# names the wrong problem. Uninstalling above needs no runtime, so this sits after it.
if ! command -v bun >/dev/null 2>&1; then
	echo "error: bun is required to run supi, and is not on PATH." >&2
	echo "       Install it from https://bun.sh, then run this again." >&2
	exit 1
fi

# Both names are checked before either is written, so a refusal never leaves a half-install.
for name in $NAMES; do
	target="$BIN_DIR/$name"
	if { [ -e "$target" ] || [ -L "$target" ]; } && ! ours "$target"; then
		echo "error: $target already exists and was not created by this installer." >&2
		echo "       Move it aside, or set BIN_DIR to somewhere else." >&2
		exit 1
	fi
done

mkdir -p "$BIN_DIR"
for name in $NAMES; do
	ln -sfn "$ENTRYPOINT" "$BIN_DIR/$name"
	echo "installed $BIN_DIR/$name -> $ENTRYPOINT"
done

# A correct install the shell cannot see looks identical to a broken one, so say which it is.
case ":$PATH:" in
*":$BIN_DIR:"*) ;;
*) echo "note: $BIN_DIR is not on your PATH; add it to run these by name." ;;
esac
