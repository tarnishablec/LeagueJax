import { parse } from "smol-toml";

type CargoDependencyEntry = string | { version?: string };

type CargoWorkspaceFile = {
  workspace?: {
    dependencies?: Record<string, CargoDependencyEntry>;
  };
};

export type PackageMetadata = {
  version?: string;
  dependencies?: Record<string, string | undefined>;
  devDependencies?: Record<string, string | undefined>;
};

export type OpenSourceRoleKey =
  | "arkUi"
  | "communityDragon"
  | "jax"
  | "lucide"
  | "maokai"
  | "rust"
  | "serde"
  | "sled"
  | "snafu"
  | "solid"
  | "solidFlow"
  | "solidMotionOne"
  | "solidPrimitives"
  | "solidRouter"
  | "solidZustand"
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
      name: "SolidJS",
      version: normalizeVersion(dependencyVersions["solid-js"]),
      license: "MIT",
      linkKind: "website",
      roleKey: "solid",
      url: "https://www.solidjs.com/",
    },
    {
      name: "Solid Router",
      version: normalizeVersion(dependencyVersions["@solidjs/router"]),
      license: "MIT",
      linkKind: "github",
      roleKey: "solidRouter",
      url: "https://github.com/solidjs/solid-router",
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
      version: normalizeVersion(dependencyVersions["@ark-ui/solid"]),
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
      name: "Lucide Solid",
      version: normalizeVersion(dependencyVersions["lucide-solid"]),
      license: "ISC",
      linkKind: "website",
      roleKey: "lucide",
      url: "https://lucide.dev",
    },
    {
      name: "solid-primitives",
      version: normalizeVersion(dependencyVersions["@solid-primitives/i18n"]),
      license: "MIT",
      linkKind: "github",
      roleKey: "solidPrimitives",
      url: "https://github.com/solidjs-community/solid-primitives",
    },
    {
      name: "solid-zustand",
      version: normalizeVersion(dependencyVersions["solid-zustand"]),
      license: "MIT",
      linkKind: "github",
      roleKey: "solidZustand",
      url: "https://github.com/solidjs-community/solid-zustand",
    },
    {
      name: "solid-motionone",
      version: normalizeVersion(dependencyVersions["solid-motionone"]),
      license: "MIT",
      linkKind: "github",
      roleKey: "solidMotionOne",
      url: "https://github.com/solidjs-community/solid-motionone",
    },
    {
      name: "solid-flow",
      version: normalizeVersion(dependencyVersions["@dschz/solid-flow"]),
      license: "MIT",
      linkKind: "github",
      roleKey: "solidFlow",
      url: "https://github.com/dschz/solid-flow",
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
