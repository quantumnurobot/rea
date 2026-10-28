# Pakwone REA workspace

This folder is Pakwone REA (fork of morluto/rea) plus the Pakwone feature-teardown team.

- The REA MCP server runs from this folder's own build (`.mcp.json` → `node scripts/rea.mjs mcp`). On Windows, `setup-windows.cmd` updates, builds and writes `.mcp.json`; on macOS/Linux use `install.sh`. Requires Node.js 22.23.4+, 24.22.1+ or 26.12.1+.
- For REA CLI commands, use `node scripts/rea.mjs <command>` from this folder. Do not use `npx pakwone-rea` (that package is not published on npm). The skills' `npx rea-agents@latest ...` examples run the original upstream package instead of this fork; prefer the local command.
- To study a feature and build Pakwone's own version, use the `/feature-teardown` skill. Team agents: recon-scout, static-analyst, runtime-observer, spec-writer, feature-builder, qa-verifier.
- Only analyse software the user owns, is licensed to analyse, or is analysing for interoperability. Builds are clean-room: the builder works from `work/<target>/04-spec.md` only.
- Teardown working files live in `work/` (git-ignored).
