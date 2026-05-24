import { constants } from "node:fs";
import { access, readFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface TauriConfig {
  productName?: string;
  version?: string;
}

interface NormalizeOptions {
  required?: boolean;
  removeStaleDestination?: boolean;
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const tauriConfigPath = resolve(repoRoot, "src-tauri", "tauri.conf.json");
const nsisArtifactDir = resolve(
  repoRoot,
  "target",
  "release",
  "bundle",
  "nsis",
);

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const readTauriConfig = async (): Promise<TauriConfig> =>
  JSON.parse(await readFile(tauriConfigPath, "utf8")) as TauriConfig;

// Local unsigned builds may not produce a signature, but a stale normalized
// signature must not survive into a later artifact set.
const normalizeArtifact = async (
  source: string,
  destination: string,
  options: NormalizeOptions = {},
): Promise<void> => {
  if (!(await exists(source))) {
    if (options.removeStaleDestination && (await exists(destination))) {
      await rm(destination, { force: true });
      console.log(`Removed stale NSIS artifact: ${destination}`);
    }

    if (options.required) {
      throw new Error(`Expected NSIS artifact not found: ${source}`);
    }

    console.log(`Optional NSIS artifact not found: ${source}`);
    return;
  }

  await rm(destination, { force: true });
  await rename(source, destination);
  console.log(`Normalized NSIS artifact: ${destination}`);
};

const main = async () => {
  const config = await readTauriConfig();
  const productName = config.productName?.trim();
  const version = config.version?.trim();

  if (!productName || !version) {
    throw new Error(
      "src-tauri/tauri.conf.json must define productName and version",
    );
  }

  const versionedName = `${productName}_${version}_x64-setup.exe`;
  const normalizedName = `${productName}_x64-setup.exe`;
  const versionedExe = resolve(nsisArtifactDir, versionedName);
  const normalizedExe = resolve(nsisArtifactDir, normalizedName);

  await normalizeArtifact(versionedExe, normalizedExe, { required: true });
  await normalizeArtifact(`${versionedExe}.sig`, `${normalizedExe}.sig`, {
    removeStaleDestination: true,
  });
};

await main();
