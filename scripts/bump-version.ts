import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type BumpKind = "patch" | "minor" | "major";

const repoRoot = resolve(import.meta.dir, "..");
const tauriConfigPath = resolve(repoRoot, "src-tauri", "tauri.conf.json");
const cargoTomlPath = resolve(repoRoot, "src-tauri", "Cargo.toml");
const packageJsonPath = resolve(repoRoot, "package.json");

function parseArgs(argv: string[]): { bump: BumpKind; dryRun: boolean } {
  const flags = new Set(argv.filter((value) => value.startsWith("--")));
  const bump = argv.find(
    (value): value is BumpKind =>
      value === "patch" || value === "minor" || value === "major",
  );

  if (!bump) {
    throw new Error("Usage: bun run ./scripts/bump-version.ts <patch|minor|major> [--dry-run]");
  }

  return {
    bump,
    dryRun: flags.has("--dry-run"),
  };
}

function parseVersion(version: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function bumpVersion(version: string, bump: BumpKind): string {
  const [major, minor, patch] = parseVersion(version);

  if (bump === "major") {
    return `${major + 1}.0.0`;
  }

  if (bump === "minor") {
    return `${major}.${minor + 1}.0`;
  }

  return `${major}.${minor}.${patch + 1}`;
}

function replaceCargoPackageVersion(content: string, nextVersion: string): string {
  const lines = content.split(/\r?\n/);
  let inPackageSection = false;
  let replaced = false;

  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("[")) {
      inPackageSection = trimmed === "[package]";
      return line;
    }

    if (inPackageSection && /^version\s*=\s*".+"$/.test(trimmed) && !replaced) {
      replaced = true;
      return line.replace(/version\s*=\s*".+"/, `version = "${nextVersion}"`);
    }

    return line;
  });

  if (!replaced) {
    throw new Error("Failed to locate [package].version in src-tauri/Cargo.toml");
  }

  return `${nextLines.join("\n")}\n`;
}

async function readCargoPackageVersion(): Promise<string> {
  const content = await readFile(cargoTomlPath, "utf8");
  const lines = content.split(/\r?\n/);
  let inPackageSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[")) {
      inPackageSection = trimmed === "[package]";
      continue;
    }

    if (inPackageSection) {
      const match = /^version\s*=\s*"(.+)"$/.exec(trimmed);
      if (match) {
        return match[1];
      }
    }
  }

  throw new Error("Failed to locate [package].version in src-tauri/Cargo.toml");
}

async function main() {
  const { bump, dryRun } = parseArgs(process.argv.slice(2));

  const tauriConfig = JSON.parse(await readFile(tauriConfigPath, "utf8")) as {
    version: string;
  };
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    version: string;
  };
  const cargoVersion = await readCargoPackageVersion();

  const currentVersions = {
    "src-tauri/tauri.conf.json": tauriConfig.version,
    "src-tauri/Cargo.toml": cargoVersion,
    "package.json": packageJson.version,
  };
  const uniqueVersions = [...new Set(Object.values(currentVersions))];

  if (uniqueVersions.length !== 1) {
    const details = Object.entries(currentVersions)
      .map(([file, version]) => `${file}: ${version}`)
      .join("\n");
    throw new Error(`Version files are out of sync:\n${details}`);
  }

  const currentVersion = uniqueVersions[0];
  const nextVersion = bumpVersion(currentVersion, bump);

  tauriConfig.version = nextVersion;
  packageJson.version = nextVersion;

  const nextTauriConfig = `${JSON.stringify(tauriConfig, null, 2)}\n`;
  const nextPackageJson = `${JSON.stringify(packageJson, null, 2)}\n`;
  const nextCargoToml = replaceCargoPackageVersion(
    await readFile(cargoTomlPath, "utf8"),
    nextVersion,
  );

  if (!dryRun) {
    await writeFile(tauriConfigPath, nextTauriConfig);
    await writeFile(cargoTomlPath, nextCargoToml);
    await writeFile(packageJsonPath, nextPackageJson);
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}Bumped version: ${currentVersion} -> ${nextVersion}`,
  );
}

await main();
