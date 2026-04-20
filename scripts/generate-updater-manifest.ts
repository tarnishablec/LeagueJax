import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

interface CliArgs {
  artifactDir: string;
  version: string;
  tag: string;
  releaseBaseUrl: string;
  notes?: string;
  output?: string;
  pubDate?: string;
}

interface UpdaterManifest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: {
    "windows-x86_64": {
      url: string;
      signature: string;
    };
  };
}

const parseArgs = (argv: string[]): CliArgs => {
  const parsed = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current?.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    parsed.set(key, value);
    index += 1;
  }

  const artifactDir = parsed.get("artifact-dir");
  const version = parsed.get("version");
  const tag = parsed.get("tag");
  const releaseBaseUrl = parsed.get("release-base-url");

  if (!artifactDir || !version || !tag || !releaseBaseUrl) {
    throw new Error(
      "Required arguments: --artifact-dir --version --tag --release-base-url",
    );
  }

  return {
    artifactDir,
    version,
    tag,
    releaseBaseUrl,
    notes: parsed.get("notes"),
    output: parsed.get("output"),
    pubDate: parsed.get("pub-date"),
  };
};

const firstFileBySuffix = async (
  artifactDir: string,
  suffix: string,
): Promise<string> => {
  const glob = new Bun.Glob(`*${suffix}`);
  const scan = glob.scan({ cwd: artifactDir, onlyFiles: true });
  const first = await scan.next();

  if (first.value) {
    return resolve(artifactDir, first.value);
  }

  throw new Error(`No ${suffix} file found in ${artifactDir}`);
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const artifactDir = resolve(args.artifactDir);
  const exePath = await firstFileBySuffix(artifactDir, ".exe");
  const sigPath = await firstFileBySuffix(artifactDir, ".sig");
  const signature = (await readFile(sigPath, "utf8")).replace(/[\r\n]+/g, "");
  const exeName = basename(exePath);
  const outputPath = resolve(args.output ?? `${artifactDir}/latest.json`);
  const notes = args.notes ?? `League Jax ${args.tag}`;
  const pubDate = args.pubDate ?? new Date().toISOString();
  const releaseBaseUrl = args.releaseBaseUrl.replace(/\/+$/, "");

  const manifest: UpdaterManifest = {
    version: args.version,
    notes,
    pub_date: pubDate,
    platforms: {
      "windows-x86_64": {
        url: `${releaseBaseUrl}/${args.tag}/${exeName}`,
        signature,
      },
    },
  };

  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(`${outputPath}`, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Generated updater manifest: ${outputPath}`);
};

await main();
