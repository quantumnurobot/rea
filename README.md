<div align="center">

# Pakwone REA

### Reverse engineer anything, with your AI agent and one MCP server.

**See a feature you like. Understand how it works, down to the binary level, with evidence.**

A [Pakwone Application](https://pakwone.com) fork of [REA: Reverse Engineer Anything](https://github.com/morluto/rea) · MIT License

</div>

> [!NOTE]
> Pakwone REA is an independent fork. Pakwone Application is not affiliated with,
> sponsored by or endorsed by the upstream REA project or its authors. The original
> MIT copyright notice is kept in [LICENSE](LICENSE). See [NOTICE.md](NOTICE.md).

---

## What it does

Pakwone REA lets coding agents such as Claude Code, Codex, Cursor and Gemini CLI
inspect software **without its source code**: native binaries, Electron and
JavaScript apps, .NET assemblies, Android APKs, firmware, websites and saved network
captures. It returns findings with evidence (file, address, call or request), so your
agent can explain how a feature works and then build and test its own version.

It does not decompile by itself. It drives established tools such as Ghidra, Hopper,
IDA and JADX on the agent's behalf, through one MCP server and one CLI.

## How it works

1. **You ask your agent** a question about a target you are allowed to analyse.
2. **The agent calls Pakwone REA** over MCP, which inspects and traces the target.
3. **Findings come back with evidence** and clearly marked unknowns.
4. **The agent explains, implements and tests**, using that evidence.

## What you can analyse

| Target | What comes back |
| --- | --- |
| Native binaries | Pseudocode, assembly, strings, symbols, calls and references (Ghidra, Hopper or IDA) |
| JavaScript / Electron apps | Modules, imports, source maps, routes, IPC and native add-ons |
| .NET assemblies | Metadata, CIL instructions and native dependencies (static, no extra tools) |
| Android APKs | Manifest, classes, decompiled methods and references (JADX + JDK) |
| Websites | Page structure, scripts, network observations and screenshots (Chrome-family browser) |
| Network captures | Requests, responses and payloads from HAR, SAZ or pcap files |
| Firmware | Regions, extraction results and native-analysis handoffs (Binwalk / Unblob on Linux) |
| Go, Rust, Flutter, PyInstaller, WASM, Godot, Unity IL2CPP | Build provenance, embedded metadata and extracted contents |

The full target table, with every requirement and guide link, is in
[UPSTREAM_README.md](UPSTREAM_README.md#what-you-can-analyze) and the [docs](docs/) folder.

## Quick start (from source)

Requires **Node.js 22.19+, 24.11+ or 26+** and npm. On Linux, a procps-compatible
`ps` must be on your `PATH`.

```bash
git clone https://github.com/quantumnurobot/rea.git
cd rea
npm install
npm run build
npm link            # installs the pakwone-rea command
pakwone-rea --help
```

Connect it to your agent by registering `pakwone-rea mcp` as a stdio MCP server.
For Claude Code:

```bash
claude mcp add pakwone-rea -- pakwone-rea mcp
```

Restart the agent afterward. The original `rea` command name also works.

> [!IMPORTANT]
> `pakwone-rea setup` registers the server as `npx -y pakwone-rea@<version> mcp`,
> so it only works once this fork is published to npm under the name `pakwone-rea`.
> Until then, use the manual registration above.

### Ask your agent

```text
Understand how search works in the Notes app, show me the evidence, and build a
similar feature for my project.
```

Replace the app and feature with your own target.

## Responsible use

Use Pakwone REA only on software you own or are permitted to analyse: learning,
research, interoperability, preservation, security research, vulnerability
disclosure and CTFs. Do not use it to copy proprietary code or assets, bypass
licensing, or break terms of service. Commercial tools it drives (IDA Pro, Hopper,
JEB) must be licensed separately. Analysis runs locally, but tool results pass
through your agent to its model provider, and Pakwone REA is not a sandbox.
Read [DISCLAIMER.md](DISCLAIMER.md) and [SECURITY.md](SECURITY.md) before use.

## Credits and license

Built on the work of morluto and the REA contributors. Upstream:
[github.com/morluto/rea](https://github.com/morluto/rea).

MIT License: see [LICENSE](LICENSE). Third-party components keep their own
licenses: see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
Pakwone modifications © 2026 Pakwone Application.
