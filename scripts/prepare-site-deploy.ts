import { cp, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const sourceSiteDir = resolve(repoRoot, "site");
const outputSiteDir = resolve(repoRoot, "tmp/cloudflare-pages-site");

const main = async () => {
  await rm(outputSiteDir, { recursive: true, force: true });
  await cp(sourceSiteDir, outputSiteDir, { recursive: true });

  console.log(`Prepared Cloudflare Pages site: ${outputSiteDir}`);
};

if (import.meta.main) {
  await main();
}
