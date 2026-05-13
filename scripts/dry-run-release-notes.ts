import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Cli } from "clerc";
import { runGitCliff } from "git-cliff";

interface CliArgs {
  from?: string;
  to?: string;
  output?: string;
  previousTag?: string;
  releaseRepo: string;
  tag?: string;
}

interface GitCliffContext {
  from: string;
  tag?: string;
  to: string;
}

const repoRoot = resolve(import.meta.dir, "..");
const tauriConfigPath = resolve(repoRoot, "src-tauri", "tauri.conf.json");
const tauriConfigRepoPath = "src-tauri/tauri.conf.json";
const defaultReleaseRepo = "tarnishablec/LeagueJax";

const readReleaseTag = async (override?: string): Promise<string> => {
  if (override) {
    return override;
  }

  const tauriConfig = JSON.parse(await readFile(tauriConfigPath, "utf8")) as {
    version?: unknown;
  };

  if (typeof tauriConfig.version !== "string" || !tauriConfig.version) {
    throw new Error("Failed to read version from src-tauri/tauri.conf.json");
  }

  return `v${tauriConfig.version}`;
};

const readPublishedTags = async (releaseRepo: string): Promise<string[]> => {
  const response = await fetch(
    `https://api.github.com/repos/${releaseRepo}/tags?per_page=100`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "league-jax-release-notes-dry-run",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to read tags from ${releaseRepo}: ${response.status} ${response.statusText}. Pass --from <ref> or --previous-tag <tag> to run offline.`,
    );
  }

  const payload = (await response.json()) as Array<{ name?: unknown }>;
  return payload.flatMap((tag) =>
    typeof tag.name === "string" && tag.name ? [tag.name] : [],
  );
};

const parseReleaseTag = (tag: string): [number, number, number] => {
  const match = /^v?(\d+\.\d+\.\d+)$/.exec(tag);

  if (!match) {
    throw new Error(`Unsupported release tag format: ${tag}`);
  }

  return match[1].split(".").map(Number) as [number, number, number];
};

const compareReleaseTags = (left: string, right: string): number => {
  const leftVersion = parseReleaseTag(left);
  const rightVersion = parseReleaseTag(right);

  for (let index = 0; index < leftVersion.length; index += 1) {
    const diff = leftVersion[index] - rightVersion[index];
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
};

const versionFromTag = (tag: string): string => {
  const version = parseReleaseTag(tag);

  return version.join(".");
};

const readPreviousPublishedTag = async (
  releaseRepo: string,
  targetTag: string,
): Promise<string> => {
  const tags = await readPublishedTags(releaseRepo);
  const candidates = tags
    .filter((tag) => compareReleaseTags(tag, targetTag) < 0)
    .sort(compareReleaseTags);
  const previousTag = candidates.at(-1);

  if (!previousTag) {
    throw new Error(
      `No published release tag is older than the ${targetTag} found in ${releaseRepo}. Pass --from <ref> or --previous-tag <tag> to override the changelog start.`,
    );
  }

  return previousTag;
};

const hasManualRangeArgs = (args: CliArgs): boolean =>
  Boolean(args.from || args.to || args.previousTag || args.tag);

const runGit = async (args: string[]): Promise<string> => {
  const child = Bun.spawn(["git", ...args], {
    cwd: repoRoot,
    stderr: "pipe",
    stdout: "pipe",
  });
  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();
  const exitCode = await child.exited;

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `git ${args.join(" ")} failed`);
  }

  return stdout.trim();
};

const readFirstCommit = async (): Promise<string> => {
  const output = await runGit(["rev-list", "--max-parents=0", "HEAD"]);
  return output.split(/\r?\n/).find(Boolean) ?? "HEAD";
};

const readVersionAtCommit = async (
  commit: string,
): Promise<string | undefined> => {
  const content = await runGit(["show", `${commit}:${tauriConfigRepoPath}`]);
  const config = JSON.parse(content) as { version?: unknown };

  if (typeof config.version !== "string") {
    return undefined;
  }

  return config.version;
};

const findVersionBoundaryCommit = async (
  version: string,
): Promise<string | undefined> => {
  const commits = (
    await runGit(["log", "--reverse", "--format=%H", "--", tauriConfigRepoPath])
  )
    .split(/\r?\n/)
    .filter(Boolean);

  let previousVersion: string | undefined;
  for (const commit of commits) {
    const currentVersion = await readVersionAtCommit(commit);
    if (currentVersion === version && previousVersion !== version) {
      return commit;
    }
    previousVersion = currentVersion;
  }

  return undefined;
};

const resolveReleaseStartForTag = async (tag: string): Promise<string> => {
  const version = versionFromTag(tag);
  const start = await findVersionBoundaryCommit(version);

  if (!start) {
    throw new Error(
      `Failed to find a source commit where ${tauriConfigRepoPath} first changed to ${version}. Pass --from <ref> to override the changelog start.`,
    );
  }

  return start;
};

const resolveDefaultGitCliffContext = async (
  args: CliArgs,
  tag: string,
): Promise<GitCliffContext> => {
  const tags = await readPublishedTags(args.releaseRepo);

  if (tags.length === 0) {
    return {
      from: await readFirstCommit(),
      tag,
      to: (await resolveTargetReleaseEnd(tag)) ?? "HEAD",
    };
  }

  if (tags.includes(tag)) {
    return {
      from: await resolveReleaseStartForTag(tag),
      to: "HEAD",
    };
  }

  const previousTag = tags
    .filter((publishedTag) => compareReleaseTags(publishedTag, tag) < 0)
    .sort(compareReleaseTags)
    .at(-1);

  if (!previousTag) {
    throw new Error(
      `No published release tag is older than the ${tag} found in ${args.releaseRepo}. Pass --from <ref> or --previous-tag <tag> to override the changelog start.`,
    );
  }

  return {
    from: await resolveReleaseStartForTag(previousTag),
    tag,
    to: (await resolveTargetReleaseEnd(tag)) ?? "HEAD",
  };
};

const buildGitCliffArgs = async (
  args: CliArgs,
  tag: string,
): Promise<{ gitCliffArgs: string[]; outputTag?: string }> => {
  const context = hasManualRangeArgs(args)
    ? {
        from: args.from ?? (await resolvePublishedReleaseStart(args, tag)),
        tag,
        to: args.to ?? (await resolveTargetReleaseEnd(tag)) ?? "HEAD",
      }
    : await resolveDefaultGitCliffContext(args, tag);

  const gitCliffArgs = [
    "--config",
    "cliff.toml",
    "--strip",
    "header",
    `${context.from}..${context.to}`,
  ];

  if (context.tag) {
    gitCliffArgs.splice(2, 0, "--tag", context.tag);
  }

  return {
    gitCliffArgs,
    outputTag: context.tag,
  };
};

const resolvePublishedReleaseStart = async (
  args: CliArgs,
  tag: string,
): Promise<string> => {
  const previousTag =
    args.previousTag ?? (await readPreviousPublishedTag(args.releaseRepo, tag));

  return resolveReleaseStartForTag(previousTag);
};

const resolveTargetReleaseEnd = async (
  tag: string,
): Promise<string | undefined> => {
  const targetVersion = versionFromTag(tag);

  return findVersionBoundaryCommit(targetVersion);
};

const toText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Uint8Array) {
    return new TextDecoder().decode(value);
  }

  return "";
};

const formatReleaseDate = (date = new Date()): string =>
  date.toISOString().slice(0, 10);

const emptyReleaseNotes = (tag?: string): string =>
  tag
    ? `## ${versionFromTag(tag)} - ${formatReleaseDate()}\n\n- No public changes.\n`
    : "## Unreleased\n\n- No public changes.\n";

const normalizeReleaseNotes = (stdout: unknown, tag?: string): string => {
  const text = toText(stdout).replace(/\s+$/u, "");

  if (!text) {
    return emptyReleaseNotes(tag);
  }

  return `${text}\n`;
};

const isReleaseNotesEmpty = (notes: string): boolean =>
  notes.includes("- No public changes.") || !notes.trim();

const main = async (args: CliArgs) => {
  const tag = await readReleaseTag(args.tag);
  const { gitCliffArgs, outputTag } = await buildGitCliffArgs(args, tag);
  const result = await runGitCliff(gitCliffArgs, {
    cwd: repoRoot,
    reject: false,
    stdio: "pipe",
  });

  if (result.stderr) {
    console.error(result.stderr);
  }

  if (result.failed) {
    throw new Error(`git-cliff failed with exit code ${result.exitCode}`);
  }

  const notes = normalizeReleaseNotes(result.stdout, outputTag);

  if (args.output) {
    const outputPath = resolve(repoRoot, args.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, notes);
    console.log(
      `Generated release notes dry run: ${outputPath}${isReleaseNotesEmpty(notes) ? " (no public changes)" : ""}`,
    );
    return;
  }

  console.log(notes);
};

await Cli()
  .scriptName("bun run release:notes:dry-run --")
  .description("Preview League Jax release notes without publishing a release.")
  .version("0.0.0")
  .command("", "Generate release notes dry run", {
    flags: {
      from: {
        type: String,
        description:
          "Manual changelog start ref. Overrides previous tag lookup.",
      },
      to: {
        type: String,
        description:
          "Manual changelog end ref. Defaults to the target version commit, or HEAD.",
      },
      output: {
        type: String,
        alias: "o",
        description: "Write release notes to a file instead of stdout.",
      },
      previousTag: {
        type: String,
        description:
          "Published tag to map back to a source commit. Skips GitHub API lookup.",
      },
      releaseRepo: {
        type: String,
        default: defaultReleaseRepo,
        description: "GitHub release repository used for published tag lookup.",
      },
      tag: {
        type: String,
        description:
          "Target release tag. Defaults to src-tauri/tauri.conf.json version.",
      },
    },
  })
  .on("", async (ctx) => {
    await main(ctx.flags as CliArgs);
  })
  .parse();
