import type { PackageMetadata } from "./about-open-source";

export const packageMetadata =
  __LEAGUE_JAX_ABOUT_PACKAGE_METADATA__ as PackageMetadata & {
    version: string;
  };
