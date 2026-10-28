#!/usr/bin/env node
// Restore REA's prebuilt Windows native helper for a source checkout.
//
// The upstream project publishes native/windows/build/{manifest.json,
// rea-windows-x64.node} only in its npm tarball, not in git. This script
// downloads the same-version rea-agents tarball with `npm pack` (npm verifies
// the registry's sha512 integrity), checks the manifest matches this
// checkout's version, platform and architecture, verifies the artifact's
// SHA-256 against the manifest, and copies both files into place. REA's
// loader repeats the version, ABI, architecture and digest checks at runtime.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "native", "windows", "build");
const files = ["manifest.json", "rea-windows-x64.node"];

const fail = (message) => {
  process.stderr.write(`Windows helper: ${message}\n`);
  process.exit(1);
};

// PAKWONE_REA_NATIVE_FORCE=1 fetches on any platform (tests, packaging).
const forced = process.env.PAKWONE_REA_NATIVE_FORCE === "1";
if (!forced && (process.platform !== "win32" || process.arch !== "x64")) {
  process.stdout.write("Windows helper: not needed on this platform.\n");
  process.exit(0);
}
if (files.every((file) => existsSync(join(target, file)))) {
  process.stdout.write("Windows helper: already present.\n");
  process.exit(0);
}

const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
// Work inside node_modules (git-ignored, already present after npm ci).
const work = join(root, "node_modules", ".cache", "pakwone-rea-native");
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
try {
  process.stdout.write(`Windows helper: downloading rea-agents@${version} from npm...\n`);
  // shell: true lets Windows run npm.cmd; quote the path in case it has spaces.
  execFileSync("npm", ["pack", `rea-agents@${version}`, "--pack-destination", `"${work}"`, "--silent"], {
    stdio: ["ignore", "ignore", "inherit"],
    shell: true,
  });
  const tarball = join(work, `rea-agents-${version}.tgz`);
  if (!existsSync(tarball)) fail(`npm did not produce ${tarball}.`);
  execFileSync("tar", ["-xzf", tarball, "-C", work, ...files.map((file) => `package/native/windows/build/${file}`)], {
    stdio: ["ignore", "ignore", "inherit"],
  });

  const extracted = join(work, "package", "native", "windows", "build");
  const manifest = JSON.parse(readFileSync(join(extracted, "manifest.json"), "utf8"));
  if (manifest.packageVersion !== version) fail(`manifest is for ${manifest.packageVersion}, expected ${version}.`);
  if (manifest.platform !== "win32" || manifest.architecture !== "x64") fail("manifest is not for Windows x64.");
  if (manifest.artifact !== "rea-windows-x64.node") fail(`unexpected artifact name ${manifest.artifact}.`);
  const digest = createHash("sha256").update(readFileSync(join(extracted, manifest.artifact))).digest("hex");
  if (digest !== manifest.artifactSha256) fail("artifact SHA-256 does not match its manifest.");

  mkdirSync(target, { recursive: true });
  for (const file of files) copyFileSync(join(extracted, file), join(target, file));
  process.stdout.write(`Windows helper: installed and verified (sha256 ${digest.slice(0, 12)}...).\n`);
} catch (cause) {
  fail(cause instanceof Error ? cause.message : String(cause));
} finally {
  rmSync(work, { recursive: true, force: true });
}
