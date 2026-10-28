import { execFile, spawn } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { createTestTempDirectory } from "../../fixtures/temporaryDirectory.js";

// Covers the Pakwone REA source installer (install.sh), which clones
// github.com/quantumnurobot/rea, runs `npm ci` and `npm run build`, and links
// the commands globally. git, npm, node and uname are faked so no network,
// npm registry or real build is touched.

const execFileAsync = promisify(execFile);
const SCRIPT = join(process.cwd(), "install.sh");

interface Fixture {
  readonly root: string;
  readonly home: string;
  readonly bin: string;
  readonly log: string;
}

const executable = async (path: string, source: string): Promise<void> => {
  await writeFile(path, source);
  await chmod(path, 0o755);
};

const createFixture = async (): Promise<Fixture> => {
  const root = await createTestTempDirectory("pakwone-install-test-");
  const home = join(root, "home");
  const bin = join(root, "bin");
  const log = join(root, "calls.log");
  await Promise.all([mkdir(home), mkdir(bin)]);
  await writeFile(log, "");
  await Promise.all([
    executable(
      join(bin, "uname"),
      '#!/bin/sh\nprintf \'%s\\n\' "${FAKE_PLATFORM:-Linux}"\n',
    ),
    executable(
      join(bin, "node"),
      `#!/bin/sh
if [ "$1" = "-p" ]; then printf '%s\\n' "\${FAKE_NODE_VERSION:-24.22.1}"; exit 0; fi
printf 'node %s\\n' "$*" >> "$FAKE_LOG"
[ "\${FAKE_REA_VERSION_FAIL:-}" = "1" ] && exit 1
printf '%s\\n' "\${FAKE_REA_VERSION:-6.8.0}"
`,
    ),
    executable(
      join(bin, "npm"),
      `#!/bin/sh
printf 'npm %s\\n' "$*" >> "$FAKE_LOG"
[ "$1" = "ci" ] && [ "\${FAKE_NPM_CI_FAIL:-}" = "1" ] && exit 1
[ "$1" = "run" ] && [ "\${FAKE_NPM_BUILD_FAIL:-}" = "1" ] && exit 1
exit 0
`,
    ),
    executable(
      join(bin, "git"),
      `#!/bin/sh
printf 'git %s\\n' "$*" >> "$FAKE_LOG"
if [ "$1" = "clone" ]; then
  for last in "$@"; do :; done
  mkdir -p "$last/.git"
fi
exit 0
`,
    ),
  ]);
  return { root, home, bin, log };
};

const environment = (
  fixture: Fixture,
  overrides: Readonly<Record<string, string>> = {},
): NodeJS.ProcessEnv => ({
  PATH: `${fixture.bin}:/usr/bin:/bin`,
  HOME: fixture.home,
  FAKE_LOG: fixture.log,
  ...overrides,
});

const run = async (
  fixture: Fixture,
  args: readonly string[] = [],
  overrides: Readonly<Record<string, string>> = {},
): Promise<{ readonly stdout: string; readonly stderr: string }> =>
  execFileAsync("/bin/bash", [SCRIPT, ...args], {
    env: environment(fixture, overrides),
  });

const calls = async (fixture: Fixture): Promise<string> =>
  readFile(fixture.log, "utf8");

describe("Pakwone REA installer Node.js admission", { timeout: 20_000 }, () => {
  it.each(["22.23.4", "24.22.1", "26.12.1", "26.13.0", "24.22.1+build.5"])(
    "accepts supported Node %s",
    async (version) => {
      const fixture = await createFixture();
      const result = await run(fixture, ["--dry-run"], {
        FAKE_NODE_VERSION: version,
      });
      expect(result.stdout).toContain(`Runtime: Node.js ${version}`);
      expect(result.stdout).toContain("Dry run complete; no changes made.");
      expect(await calls(fixture)).toBe("");
    },
  );

  it.each([
    "22.19.0",
    "22.23.3",
    "24.11.0",
    "24.22.0",
    "23.0.0",
    "26.0.0",
    "26.12.0",
    "26.12.1-rc.1",
  ])("rejects unsupported Node %s before touching git or npm", async (version) => {
    const fixture = await createFixture();
    await expect(
      run(fixture, [], { FAKE_NODE_VERSION: version }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining(`Node.js ${version} is too old`),
    });
    expect(await calls(fixture)).toBe("");
  });
});

describe("Pakwone REA installer", { timeout: 20_000 }, () => {
  it("clones this fork, installs, builds, links and reports the version", async () => {
    const fixture = await createFixture();
    const target = join(fixture.home, ".pakwone-rea");
    const result = await run(fixture);
    expect(result.stdout).toContain(
      "Source:  https://github.com/quantumnurobot/rea.git (main)",
    );
    expect(result.stdout).toContain(
      `Pakwone REA 6.8.0 is installed in ${target}.`,
    );
    expect(result.stdout).toContain(
      `MCP server command: node ${target}/scripts/rea.mjs mcp`,
    );
    const log = await calls(fixture);
    expect(log).toContain(
      `git clone --quiet --branch main https://github.com/quantumnurobot/rea.git ${target}`,
    );
    const order = ["npm ci", "npm run build", "npm install --global", "node scripts/rea.mjs --version"].map(
      (call) => log.indexOf(call),
    );
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(log).not.toMatch(/rea-agents|morluto/);
  });

  it("honours --dir and --ref", async () => {
    const fixture = await createFixture();
    const target = join(fixture.root, "custom");
    await run(fixture, ["--dir", target, "--ref", "v1"]);
    expect(await calls(fixture)).toContain(
      `git clone --quiet --branch v1 https://github.com/quantumnurobot/rea.git ${target}`,
    );
  });

  it("updates an existing checkout instead of cloning", async () => {
    const fixture = await createFixture();
    const target = join(fixture.home, ".pakwone-rea");
    await mkdir(join(target, ".git"), { recursive: true });
    await run(fixture);
    const log = await calls(fixture);
    expect(log).not.toContain("git clone");
    expect(log).toContain(`git -C ${target} fetch --quiet origin main`);
    expect(log).toContain(`git -C ${target} merge --quiet --ff-only origin/main`);
  });

  it("refuses a target folder that is not a checkout", async () => {
    const fixture = await createFixture();
    await mkdir(join(fixture.home, ".pakwone-rea"));
    await expect(run(fixture)).rejects.toMatchObject({
      stderr: expect.stringContaining("is not a Pakwone REA checkout"),
    });
    expect(await calls(fixture)).not.toContain("npm");
  });

  it.each([
    ["FAKE_NPM_CI_FAIL", "dependency install failed."],
    ["FAKE_NPM_BUILD_FAIL", "build failed."],
  ])("stops when %s", async (flag, message) => {
    const fixture = await createFixture();
    await expect(run(fixture, [], { [flag]: "1" })).rejects.toMatchObject({
      stderr: expect.stringContaining(message),
    });
    expect(await calls(fixture)).not.toContain("npm install --global");
  });

  it("fails instead of reporting success when the built CLI cannot run", async () => {
    const fixture = await createFixture();
    const failure = run(fixture, [], { FAKE_REA_VERSION_FAIL: "1" });
    await expect(failure).rejects.toMatchObject({
      stderr: expect.stringContaining("did not run"),
    });
    await failure.catch((error: { stdout: string }) => {
      expect(error.stdout).not.toContain("is installed in");
    });
  });

  it("points Windows users to setup-windows.cmd", async () => {
    const fixture = await createFixture();
    await expect(
      run(fixture, [], { FAKE_PLATFORM: "MINGW64_NT-10.0" }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining("run setup-windows.cmd"),
    });
  });

  it("rejects unknown options", async () => {
    const fixture = await createFixture();
    await expect(run(fixture, ["--version", "1.0.0"])).rejects.toMatchObject({
      stderr: expect.stringContaining("unknown option: --version"),
    });
  });

  it("runs nothing when a piped download is truncated", async () => {
    const fixture = await createFixture();
    const source = await readFile(SCRIPT, "utf8");
    const cut = source.slice(0, source.indexOf('main "$@"') + 'main "$@"'.length);
    const result = await new Promise<{ code: number | null }>((resolve, reject) => {
      const child = spawn("/bin/bash", ["-s"], {
        env: environment(fixture),
        stdio: ["pipe", "ignore", "ignore"],
      });
      child.on("error", reject);
      child.on("close", (code) => resolve({ code }));
      child.stdin.end(cut);
    });
    expect(result.code).not.toBe(0);
    expect(await calls(fixture)).toBe("");
  });
});
