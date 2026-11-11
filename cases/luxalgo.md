# Case: LuxAlgo

Intake brief for the Pakwone REA feature-teardown team. Run `/feature-teardown`
and point it at this file; it answers the intake questions in step 0.

- **Slug:** `luxalgo` (working files go in `work/luxalgo/`, git-ignored)
- **Status:** intake ready, no analysis run yet
- **Checked:** 2026-11-11. Licence terms change; re-check the links before a build.

## Target

LuxAlgo publishes trading indicators and the tooling around them. Almost all of
it is readable source, so this case is mostly source study rather than binary
work. The paid TradingView toolkits are the exception and are out of scope.

| Part | Where | Licence | In scope |
| --- | --- | --- | --- |
| Library concept pages (written explanations) | <https://www.luxalgo.com/library/> | LuxAlgo Library licence v1.0, free with attribution | Yes |
| Library indicator source (Pine Script) | Shown on each Library page; also on TradingView as open-source scripts | CC BY-NC-SA 4.0 | Study only |
| Vela charting core | <https://github.com/LuxAlgo/Vela> | Apache-2.0 | Yes |
| PineTS (Pine Script runtime) | <https://github.com/LuxAlgo/PineTS> | AGPL-3.0-only | Study only |
| Vela-PineTS addon | <https://github.com/LuxAlgo/Vela-pinets> | AGPL-3.0-only | Study only |
| Trade Journal | <https://github.com/LuxAlgo/trade-journal> | MIT | Yes |
| Prop Firm Sim | <https://github.com/LuxAlgo/prop-firm-sim> | MIT | Yes |
| Broker SDK | <https://github.com/LuxAlgo/broker-sdk> | MIT | Yes |
| Trade Relay | <https://github.com/LuxAlgo/trade-relay> | MIT | Yes |
| LuxAlgo MCP server | <https://github.com/LuxAlgo/luxalgo-mcp-server> (hosted: `https://mcp.luxalgo.com/mcp`) | MIT | Yes |
| Paid TradingView toolkits (Signals & Overlays, Price Action Concepts, Oscillator Matrix) | TradingView, invite-only | Proprietary, closed source | **No** |
| Vela Pro | Commercial download | Developer License Agreement, source confidential | **No** |

## Basis for analysis

- Open-source repositories: analysed under their published licences.
- Library pages and indicator source: published by LuxAlgo for reading and study.
- Nothing in this case involves bypassing a protection. If a step would need to
  get around invite-only access, a licence check or obfuscation, stop that line
  and tell the user.

## Licence boundaries for anything Pakwone ships

Pakwone's trading app is a paid product, so these matter:

1. **CC BY-NC-SA 4.0 indicator code is non-commercial.** LuxAlgo's licence page
   says building its indicators into a paid product is commercial use. Do not
   copy, port or translate that Pine Script into a Pakwone product without a
   commercial licence from LuxAlgo (<https://www.luxalgo.com/licensing/>).
2. **AGPL-3.0 (PineTS, Vela-PineTS)** requires releasing the source of the
   product it is built into. Do not embed it in a closed-source Pakwone app
   without LuxAlgo's commercial licence.
3. **Apache-2.0 and MIT parts** can be used commercially; keep the copyright and
   licence notices.
4. **Written Library content** can be quoted and cited with the credit line
   `Source: LuxAlgo Library — luxalgo.com/library/...`. Do not republish it
   wholesale or sell access to it.
5. **Names:** "LuxAlgo", "Vela", "TradingView" and "Pine Script" are other
   companies' marks. Pakwone features get their own names.

This is a working summary, not legal advice. Have a lawyer confirm before a
commercial release that draws on this case.

## Clean-room rule for this case

The spec-writer writes `work/luxalgo/04-spec.md` from the **written concept
pages and observed behaviour** (what the indicator shows for given price data),
described in Pakwone's own words. The spec must not contain LuxAlgo source code
or line-by-line descriptions of it. The feature-builder sees the spec only.

## Suggested first features

Pick one per teardown run. Each is a general trading concept with a Library
concept page, so a spec can be written without relying on LuxAlgo's code.

| Feature | Why it fits Pakwone |
| --- | --- |
| Previous high/low levels across timeframes | Matches the planned price positioning against month, week, day, 4 hr, 1 hr and 15 min highs and lows |
| Liquidity sweeps | Rule-based event on those same highs and lows |
| Market structure (break of structure / change of character) | Rule-based trend state that can be shown as a status, not a chart study |
| Prop Firm Sim (MIT) | Monte Carlo pass-odds maths; reusable for paper-trading statistics |
| LuxAlgo MCP server (MIT) | Pattern for exposing Pakwone tools to AI agents |

## How to run

1. Open this folder in Claude Code.
2. Run `/feature-teardown` and say: "Use `cases/luxalgo.md`. Feature: <one from
   the list>. Build target: <Pakwone repo and stack>."
3. For open-source parts, clone the repository into `work/luxalgo/src/` and let
   `recon-scout` and `static-analyst` read it directly. REA's binary tools are
   not needed for source that is already published.
4. For the hosted site or MCP endpoint, `runtime-observer` may record requests
   and responses from normal, signed-out use only.

## Sources

- <https://www.luxalgo.com/library/license/>
- <https://www.luxalgo.com/oss.md>
- <https://www.luxalgo.com/licensing.md>
