import { parse } from "smol-toml";

type CargoDependencyEntry = string | { version?: string };

type CargoWorkspaceFile = {
  workspace?: {
    dependencies?: Record<string, CargoDependencyEntry>;
  };
};

type PackageMetadata = {
  dependencies?: Record<string, string | undefined>;
  devDependencies?: Record<string, string | undefined>;
};

export type OpenSourceRoleKey =
  | "arkUi"
  | "communityDragon"
  | "jax"
  | "lucide"
  | "maokai"
  | "react"
  | "reactRouter"
  | "rust"
  | "serde"
  | "sled"
  | "snafu"
  | "swr"
  | "tauri"
  | "thaterror"
  | "tokio"
  | "tracing"
  | "typescript"
  | "tsRs"
  | "vanillaExtract"
  | "vite"
  | "zod"
  | "zustand";

export type OpenSourceItem = {
  license: string;
  linkKind: "github" | "website";
  name: string;
  roleKey: OpenSourceRoleKey;
  url: string;
  version: string | null;
};

const normalizeVersion = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  return value.replace(/^[~^]/, "");
};

const resolveCargoWorkspaceDependencies = (
  cargoWorkspaceManifest: string,
): Record<string, CargoDependencyEntry> => {
  if (!cargoWorkspaceManifest.trim()) {
    return {};
  }

  return (
    (parse(cargoWorkspaceManifest) as CargoWorkspaceFile).workspace
      ?.dependencies ?? {}
  );
};

const resolveCargoDependencyVersion = (
  cargoWorkspaceDependencies: Record<string, CargoDependencyEntry>,
  dependencyName: string,
): string | null => {
  const value = cargoWorkspaceDependencies[dependencyName];

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value.version === "string") {
    return value.version;
  }

  return null;
};

export function createOpenSourceSoftware(
  packageMetadata: PackageMetadata,
  cargoWorkspaceManifest: string,
): OpenSourceItem[] {
  const dependencyVersions = packageMetadata.dependencies ?? {};
  const devDependencyVersions = packageMetadata.devDependencies ?? {};
  const cargoWorkspaceDependencies = resolveCargoWorkspaceDependencies(
    cargoWorkspaceManifest,
  );

  return [
    {
      name: "jax",
      version: null,
      license: "MPL-2.0",
      linkKind: "github",
      roleKey: "jax",
      url: "https://github.com/tarnishablec/jax",
    },
    {
      name: "maokai",
      version: null,
      license: "MPL-2.0",
      linkKind: "github",
      roleKey: "maokai",
      url: "https://github.com/tarnishablec/maokai",
    },
    {
      name: "thaterror",
      version: normalizeVersion(dependencyVersions["@thaterror/core"]),
      license: "MPL-2.0",
      linkKind: "github",
      roleKey: "thaterror",
      url: "https://github.com/tarnishablec/thaterror",
    },
    {
      name: "Community Dragon",
      version: null,
      license: "Riot Legal Jibber Jabber",
      linkKind: "website",
      roleKey: "communityDragon",
      url: "https://www.communitydragon.org/",
    },
    {
      name: "Tauri",
      version: normalizeVersion(dependencyVersions["@tauri-apps/api"]),
      license: "Apache-2.0 OR MIT",
      linkKind: "website",
      roleKey: "tauri",
      url: "https://tauri.app",
    },
    {
      name: "React",
      version: normalizeVersion(dependencyVersions.react),
      license: "MIT",
      linkKind: "website",
      roleKey: "react",
      url: "https://react.dev/",
    },
    {
      name: "React Router",
      version: normalizeVersion(dependencyVersions["react-router"]),
      license: "MIT",
      linkKind: "github",
      roleKey: "reactRouter",
      url: "https://github.com/remix-run/react-router",
    },
    {
      name: "TypeScript",
      version: normalizeVersion(devDependencyVersions.typescript),
      license: "Apache-2.0",
      linkKind: "website",
      roleKey: "typescript",
      url: "https://www.typescriptlang.org/",
    },
    {
      name: "Rust",
      version: null,
      license: "MIT OR Apache-2.0",
      linkKind: "website",
      roleKey: "rust",
      url: "https://www.rust-lang.org/",
    },
    {
      name: "Vite",
      version: normalizeVersion(devDependencyVersions.vite),
      license: "MIT",
      linkKind: "website",
      roleKey: "vite",
      url: "https://vite.dev",
    },
    {
      name: "Ark UI",
      version: normalizeVersion(dependencyVersions["@ark-ui/react"]),
      license: "MIT",
      linkKind: "website",
      roleKey: "arkUi",
      url: "https://ark-ui.com",
    },
    {
      name: "Vanilla Extract",
      version: normalizeVersion(dependencyVersions["@vanilla-extract/css"]),
      license: "MIT",
      linkKind: "github",
      roleKey: "vanillaExtract",
      url: "https://github.com/vanilla-extract-css/vanilla-extract",
    },
    {
      name: "Lucide React",
      version: normalizeVersion(dependencyVersions["lucide-react"]),
      license: "ISC",
      linkKind: "website",
      roleKey: "lucide",
      url: "https://lucide.dev",
    },
    {
      name: "SWR",
      version: normalizeVersion(dependencyVersions.swr),
      license: "MIT",
      linkKind: "website",
      roleKey: "swr",
      url: "https://swr.vercel.app",
    },
    {
      name: "zustand",
      version: normalizeVersion(dependencyVersions.zustand),
      license: "MIT",
      linkKind: "github",
      roleKey: "zustand",
      url: "https://github.com/pmndrs/zustand",
    },
    {
      name: "Tokio",
      version: resolveCargoDependencyVersion(
        cargoWorkspaceDependencies,
        "tokio",
      ),
      license: "MIT",
      linkKind: "website",
      roleKey: "tokio",
      url: "https://tokio.rs",
    },
    {
      name: "Serde",
      version: resolveCargoDependencyVersion(
        cargoWorkspaceDependencies,
        "serde",
      ),
      license: "MIT OR Apache-2.0",
      linkKind: "github",
      roleKey: "serde",
      url: "https://github.com/serde-rs/serde",
    },
    {
      name: "ts-rs",
      version: resolveCargoDependencyVersion(
        cargoWorkspaceDependencies,
        "ts-rs",
      ),
      license: "MIT",
      linkKind: "github",
      roleKey: "tsRs",
      url: "https://github.com/Aleph-Alpha/ts-rs",
    },
    {
      name: "tracing",
      version: resolveCargoDependencyVersion(
        cargoWorkspaceDependencies,
        "tracing",
      ),
      license: "MIT",
      linkKind: "github",
      roleKey: "tracing",
      url: "https://github.com/tokio-rs/tracing",
    },
    {
      name: "sled",
      version: resolveCargoDependencyVersion(
        cargoWorkspaceDependencies,
        "sled",
      ),
      license: "MIT OR Apache-2.0",
      linkKind: "github",
      roleKey: "sled",
      url: "https://github.com/spacejam/sled",
    },
    {
      name: "snafu",
      version: resolveCargoDependencyVersion(
        cargoWorkspaceDependencies,
        "snafu",
      ),
      license: "MIT OR Apache-2.0",
      linkKind: "github",
      roleKey: "snafu",
      url: "https://github.com/shepmaster/snafu",
    },
    {
      name: "Zod",
      version: normalizeVersion(dependencyVersions.zod),
      license: "MIT",
      linkKind: "website",
      roleKey: "zod",
      url: "https://zod.dev",
    },
  ];
}
