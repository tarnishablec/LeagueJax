import { cp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface PackageJson {
  version?: string;
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const sourceSiteDir = resolve(repoRoot, "site");
const outputSiteDir = resolve(repoRoot, "tmp/cloudflare-pages-site");
const packageJsonPath = resolve(repoRoot, "package.json");
const outputIndexPath = resolve(outputSiteDir, "index.html");

export const giteeInstallerUrlForVersion = (version: string): string => {
  const normalizedVersion = version.trim().replace(/^v/u, "");
  const tag = `v${normalizedVersion}`;
  const fileName = `LeagueJax_${normalizedVersion}_x64-setup.exe`;

  return `https://gitee.com/tarnishablec/league-jax-releases/releases/download/${tag}/${fileName}`;
};

export const replaceGiteeDownloadUrl = (
  html: string,
  downloadUrl: string,
): string => {
  const hrefPattern =
    /(<a\b(?=[^>]*\bid="giteeDownload")[^>]*\bhref=")[^"]*(")/u;
  const fallbackPattern =
    /(<a\b(?=[^>]*\bid="giteeDownload")[^>]*\bdata-fallback-href=")[^"]*(")/u;

  if (!hrefPattern.test(html) || !fallbackPattern.test(html)) {
    throw new Error(
      "Could not find the Gitee download link in site/index.html",
    );
  }

  const withHref = html.replace(hrefPattern, `$1${downloadUrl}$2`);
  return withHref.replace(fallbackPattern, `$1${downloadUrl}$2`);
};

const readPackageVersion = async (): Promise<string> => {
  const packageJson = JSON.parse(
    await readFile(packageJsonPath, "utf8"),
  ) as PackageJson;

  if (!packageJson.version) {
    throw new Error("package.json does not define a version");
  }

  return packageJson.version;
};

const main = async () => {
  const version = await readPackageVersion();
  const downloadUrl = giteeInstallerUrlForVersion(version);

  await rm(outputSiteDir, { recursive: true, force: true });
  await cp(sourceSiteDir, outputSiteDir, { recursive: true });

  const indexHtml = await readFile(outputIndexPath, "utf8");
  await writeFile(
    outputIndexPath,
    replaceGiteeDownloadUrl(indexHtml, downloadUrl),
  );

  console.log(`Prepared Cloudflare Pages site: ${outputSiteDir}`);
  console.log(`Gitee download URL: ${downloadUrl}`);
};

if (import.meta.main) {
  await main();
}
