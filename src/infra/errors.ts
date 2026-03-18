import { That, type ThatError } from "@thaterror/core";

export const AppError = That({
  JaxRegisterAfterStart: (shardId: string) =>
    `[jax] Cannot register shard "${shardId}" after start().`,
  JaxDuplicateShardId: (
    shardId: string,
    shardClassName: string,
    existingClassName: string,
  ) =>
    `[jax] Duplicate shard id "${shardId}" on "${shardClassName}" and "${existingClassName}".`,
  JaxRebuildAfterStart: "[jax] Cannot rebuild after start().",
  JaxMissingDependency: (dependencyId: string, shardId: string) =>
    `[jax] Missing dependency "${dependencyId}" required by "${shardId}".`,
  JaxInternalMissingShard: (shardId: string) =>
    `[jax] Internal error: shard "${shardId}" is missing.`,
  JaxInternalUnavailableDuringStart: (shardId: string) =>
    `[jax] Internal error: shard "${shardId}" is unavailable during start().`,
  JaxShardUnavailable: (shardId: string) =>
    `[jax] Shard "${shardId}" is not available. Did you register/build it?`,
  JaxRegistryNotBuilt:
    "[jax] Registry is empty. Call register().build() first.",
  JaxCycleDetected: (cyclePath: string) =>
    `[jax] Circular dependency detected: ${cyclePath}`,
  JaxShutdownFailed: (shardId: string) =>
    `[jax] Shutdown failed while tearing down shard "${shardId}".`,
  RegistryRuntimeNotInitialized: "[registry] Jax runtime is not initialized.",
  RegistryShardStartupFailed: (failedIds: string) =>
    `[registry] Shard startup failed: ${failedIds}`,
  SettingsRegistration: (message: string) => `[settings] ${message}`,
});

export type AppThatError = ThatError<typeof AppError>;

export const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
