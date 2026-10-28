#!/bin/bash
{
# Pakwone REA installer for macOS and Linux. Windows: run setup-windows.cmd.
#
# Builds Pakwone REA from source (github.com/quantumnurobot/rea) instead of
# downloading an npm package, so the code that runs is the code in this fork.
#
# Truncation guard: this brace group opens on line 2 and closes on the last
# line, so bash reads the whole file before running anything. A download cut
# off part-way fails with a syntax error instead of running half a script.
set -euo pipefail

REPOSITORY_URL="https://github.com/quantumnurobot/rea.git"
install_dir="${PAKWONE_REA_DIR:-$HOME/.pakwone-rea}"
ref="${PAKWONE_REA_REF:-main}"
dry_run=false

fail() {
  printf 'Pakwone REA installation failed: %s\n' "$1" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: install.sh [--dir DIRECTORY] [--ref BRANCH_OR_TAG] [--dry-run]

Clones (or updates) Pakwone REA into DIRECTORY (default ~/.pakwone-rea),
installs dependencies, builds it, and links the `pakwone-rea` and `rea`
commands into npm's global bin directory.
EOF
}

node_ok() {
  local major minor patch
  IFS=. read -r major minor patch <<<"$1"
  # Accept build metadata (24.22.1+build.5) but not pre-releases (26.12.1-rc.1).
  [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ && "$patch" =~ ^[0-9]+(\+[0-9A-Za-z.-]+)?$ ]] || return 1
  patch="${patch%%+*}"
  ((major == 22 && (minor > 23 || minor == 23 && patch >= 4) ||
    major == 24 && (minor > 22 || minor == 22 && patch >= 1) ||
    major == 26 && (minor > 12 || minor == 12 && patch >= 1) ||
    major > 26))
}

main() {
  while (($# > 0)); do
    case "$1" in
      --dir) (($# >= 2)) || fail "--dir requires a value."; install_dir="$2"; shift 2 ;;
      --ref) (($# >= 2)) || fail "--ref requires a value."; ref="$2"; shift 2 ;;
      --dry-run) dry_run=true; shift ;;
      --help|-h) usage; exit 0 ;;
      *) fail "unknown option: $1" ;;
    esac
  done

  platform="$(uname -s)"
  [ "$platform" = "Darwin" ] || [ "$platform" = "Linux" ] || fail "this script supports macOS and Linux. On Windows, run setup-windows.cmd."
  command -v git >/dev/null 2>&1 || fail "git is required."
  command -v node >/dev/null 2>&1 || fail "Node.js 22.23.4+, 24.22.1+ or 26.12.1+ is required (https://nodejs.org)."
  command -v npm >/dev/null 2>&1 || fail "npm is required; it comes with Node.js."
  node_version="$(node -p 'process.versions.node')"
  node_ok "$node_version" || fail "Node.js $node_version is too old. Install 22.23.4+, 24.22.1+ or 26.12.1+ (for example: nvm install 24)."

  printf 'Pakwone REA install plan\n'
  printf '  Source:  %s (%s)\n' "$REPOSITORY_URL" "$ref"
  printf '  Folder:  %s\n' "$install_dir"
  printf '  Runtime: Node.js %s\n' "$node_version"
  if [ "$dry_run" = true ]; then
    printf 'Dry run complete; no changes made.\n'
    exit 0
  fi

  if [ -d "$install_dir/.git" ]; then
    git -C "$install_dir" fetch --quiet origin "$ref"
    git -C "$install_dir" checkout --quiet "$ref"
    git -C "$install_dir" merge --quiet --ff-only "origin/$ref" || fail "local changes in $install_dir block the update. Commit or discard them, then retry."
  else
    [ ! -e "$install_dir" ] || fail "$install_dir exists and is not a Pakwone REA checkout. Pass --dir to choose another folder."
    git clone --quiet --branch "$ref" "$REPOSITORY_URL" "$install_dir"
  fi

  cd "$install_dir"
  HUSKY=0 npm ci --no-audit --no-fund || fail "dependency install failed."
  npm run build || fail "build failed."
  npm install --global --no-audit --no-fund . || fail "could not link the commands. Check npm's global prefix permissions."

  installed_version="$(node scripts/rea.mjs --version 2>/dev/null | tr -d '[:space:]')" || installed_version=""
  [ -n "$installed_version" ] || fail "the build finished but pakwone-rea --version did not run. Re-run this installer; if it fails again, run 'npm ci && npm run build' in $install_dir and check the output."

  printf '\nPakwone REA %s is installed in %s.\n' "$installed_version" "$install_dir"
  printf 'MCP server command: node %s/scripts/rea.mjs mcp\n' "$install_dir"
}

main "$@"
exit $?
}
