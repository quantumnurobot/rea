---
name: leanrea-windows
description: Windows companion to /leanrea. Fast first moves for reverse engineering shipped Windows software (PE .exe/.dll, Electron apps, .NET, Go, installers, APKs, SQLite) with Node, Python and PowerShell, no MCP needed. Use on a Windows PC when the macOS commands in /leanrea do not apply.
---

# leanrea on Windows

Pakwone's own companion to the third-party `/leanrea` skill. Its rules still apply: work on a copy, take the cheapest inventory first, slice big files instead of reading them, batch probes into one call, and mark each claim **seen**, **inferred** or **unknown**.

Only analyse software the user owns, is licensed to analyse, or is analysing for interoperability.

## Setup

Commands below are written for the Git Bash shell that Claude Code uses on Windows. They need Node.js (already required by Pakwone REA) and Python 3.

- Windows often has `py` instead of `python`. Set once per call: `PY=$(command -v python || command -v py)`.
- PE inventory needs one package: `$PY -m pip install pefile`.
- `rg` (ripgrep) is optional: `winget install BurntSushi.ripgrep.MSVC`. Without it, use `command grep -rE` (inside Claude Code a bare `grep` is a different tool that rejects these patterns).
- Put extractions under `$TEMP/re/<name>`. Quote every path; Windows paths contain spaces.

## First move: one call each

PE file (`.exe`, `.dll`, `.node`, `.sys`):

```sh
T="./app.exe"; PY=$(command -v python || command -v py); "$PY" - "$T" <<'EOF'
import sys, re, pefile
p = pefile.PE(sys.argv[1]); f = p.FILE_HEADER; o = p.OPTIONAL_HEADER
print('--- HEADER', hex(f.Machine), 'pe32+' if o.Magic == 0x20b else 'pe32', 'subsystem', o.Subsystem, 'dll' if p.is_dll() else 'exe')
print('--- DOTNET', bool(o.DATA_DIRECTORY[14].VirtualAddress))
print('--- SECTIONS', [(s.Name.rstrip(b'\0').decode(errors='replace'), s.SizeOfRawData) for s in p.sections])
print('--- IMPORTS')
for d in getattr(p, 'DIRECTORY_ENTRY_IMPORT', []):
    print(' ', d.dll.decode(), len(d.imports), [i.name.decode() for i in d.imports if i.name][:12])
print('--- EXPORTS', [e.name.decode() for e in getattr(p, 'DIRECTORY_ENTRY_EXPORT', None).symbols if e.name][:150] if hasattr(p, 'DIRECTORY_ENTRY_EXPORT') else [])
data = open(sys.argv[1], 'rb').read()
s = [m.decode() for m in re.findall(rb'[\x20-\x7e]{6,}', data)] + [m.decode('utf-16le') for m in re.findall(rb'(?:[\x20-\x7e]\x00){6,}', data)]
print('--- STRINGS', len(s)); print('\n'.join(s[:300]))
EOF
```

The imports are the capability map. Windows strings are often UTF-16, which the script reads as well as ASCII. Version and signer, from PowerShell:

```sh
powershell -NoProfile -Command "(Get-Item 'app.exe').VersionInfo | Format-List; Get-AuthenticodeSignature 'app.exe' | Format-List Status,SignerCertificate"
```

Electron app (look in `%LOCALAPPDATA%\Programs\<App>\resources\app.asar`):

```sh
A="./app.asar"; X="$TEMP/re/asar"; rm -rf "$X"; npx -y @electron/asar extract "$A" "$X" && node -e "const p=require(process.argv[1]+'/package.json');console.log(p.name,p.version,p.main)" "$X"; find "$X" -path '*/node_modules' -prune -o -type f \( -name '*.js' -o -name '*.node' \) -print | head -60; ls "${A}.unpacked/node_modules" 2>/dev/null; command grep -rlE --exclude-dir=node_modules 'exposeInMainWorld' "$X"
```

Then slice around a needle: `command grep -rhoE --exclude-dir=node_modules '.{0,120}NEEDLE.{0,120}' "$X" | head -20`. For IPC channels put `(ipcMain\.(handle|on)|ipcRenderer\.(invoke|send|on)|contextBridge)` in place of NEEDLE.

## Router

| Target                     | Fastest path on Windows                                                                                                                                                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native PE logic            | Inventory first (above). For code: `dumpbin /disasm` or `dumpbin /imports /exports` from a Visual Studio developer prompt, or `llvm-objdump -d --no-show-raw-insn`. For real pseudocode use Ghidra through the Pakwone REA MCP server and `/feature-teardown`. |
| .NET (`DOTNET True` above) | `dotnet tool install -g ilspycmd`, then `ilspycmd -p -o X app.dll` and search X. P/Invoke: search for `DllImport`.                                                                                                                                             |
| Go                         | `go version -m app.exe` gives toolchain, module and dependencies in one call.                                                                                                                                                                                  |
| Installer                  | NSIS and most `.exe` installers: `7z x setup.exe -oX`. MSI: `msiexec /a app.msi /qb TARGETDIR=C:\re\msi`. Then route each extracted file through this table.                                                                                                   |
| Android APK                | `jadx -d X --show-bad-code a.apk`. Quick listing: `tar -tf a.apk`.                                                                                                                                                                                             |
| SQLite                     | Copy the file plus any `-wal` file, then: `"$PY" -c "import sqlite3,sys;c=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True);print('\n'.join(r[0] for r in c.execute('select sql from sqlite_master where sql is not null')))" copy.db`                  |
| Web bundle                 | Same as `/leanrea`: find `sourceMappingURL`, dump `sourcesContent`, pretty-print with `npx -y prettier --parser babel F > F.pretty.js`.                                                                                                                        |
| Network capture            | HAR: `node -e "for(const e of JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).log.entries)console.log(e.request.method,e.request.url)" capture.har`. pcap: `tshark` from Wireshark.                                                             |
| Running app                | `powershell -Command "Get-Process App \| Select -Expand Modules"` for loaded DLLs; Process Monitor for file, registry and network activity; Electron main process with `--inspect` if its fuses allow it.                                                      |

## Not covered

Mach-O, entitlements, `otool`, `lipo` and the other macOS routes in `/leanrea` do not apply to Windows targets. For a macOS or Linux binary sitting on this PC, use WSL and follow `/leanrea` there.
