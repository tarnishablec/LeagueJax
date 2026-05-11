import type {
  ClaimToolClaimablesDto,
  ClaimToolClaimRequestDto,
  ClaimToolRunResultDto,
} from "@/bindings/claim_tool";

export const claimBuckets = ["rewards", "missions", "eventHub"] as const;

export type ClaimBucket = (typeof claimBuckets)[number];
export type ClaimBucketIds = Record<ClaimBucket, Set<string>>;

type ClaimRunVisibilityResult = Pick<
  ClaimToolRunResultDto,
  "claimed" | "failed"
>;

export function createEmptyClaimBucketIds(): ClaimBucketIds {
  return {
    rewards: new Set<string>(),
    missions: new Set<string>(),
    eventHub: new Set<string>(),
  };
}

export function claimableIds(
  data: ClaimToolClaimablesDto | undefined,
): ClaimBucketIds {
  const next = createEmptyClaimBucketIds();
  if (!data) {
    return next;
  }

  for (const bucket of claimBuckets) {
    for (const item of data[bucket]) {
      if (item.status === "claimable") {
        next[bucket].add(item.id);
      }
    }
  }
  return next;
}

export function selectedCount(selection: ClaimBucketIds): number {
  return Object.values(selection).reduce((count, ids) => count + ids.size, 0);
}

export function requestFromSelection(
  selection: ClaimBucketIds,
): ClaimToolClaimRequestDto {
  return {
    rewards: [...selection.rewards],
    missions: [...selection.missions],
    eventHub: [...selection.eventHub],
  };
}

// The LCU can briefly return already-claimed items after a successful claim request, so the UI keeps them hidden until a later refresh confirms they are gone.
export function addHiddenClaimedIds(
  current: ClaimBucketIds,
  request: ClaimToolClaimRequestDto,
  result: ClaimRunVisibilityResult,
): ClaimBucketIds {
  if (result.failed > 0 || result.claimed <= 0) {
    return current;
  }

  const next = cloneClaimBucketIds(current);
  let changed = false;
  for (const bucket of claimBuckets) {
    for (const id of request[bucket]) {
      const normalizedId = id.trim();
      if (normalizedId && !next[bucket].has(normalizedId)) {
        next[bucket].add(normalizedId);
        changed = true;
      }
    }
  }
  return changed ? next : current;
}

export function filterClaimablesByHiddenIds(
  data: ClaimToolClaimablesDto,
  hiddenIds: ClaimBucketIds,
): ClaimToolClaimablesDto;
export function filterClaimablesByHiddenIds(
  data: undefined,
  hiddenIds: ClaimBucketIds,
): undefined;
export function filterClaimablesByHiddenIds(
  data: ClaimToolClaimablesDto | undefined,
  hiddenIds: ClaimBucketIds,
): ClaimToolClaimablesDto | undefined;
export function filterClaimablesByHiddenIds(
  data: ClaimToolClaimablesDto | undefined,
  hiddenIds: ClaimBucketIds,
): ClaimToolClaimablesDto | undefined {
  if (!data || !hasAnyIds(hiddenIds)) {
    return data;
  }

  let changed = false;
  const filtered = {
    ...data,
    rewards: data.rewards.filter((item) => {
      const visible = !hiddenIds.rewards.has(item.id);
      changed ||= !visible;
      return visible;
    }),
    missions: data.missions.filter((item) => {
      const visible = !hiddenIds.missions.has(item.id);
      changed ||= !visible;
      return visible;
    }),
    eventHub: data.eventHub.filter((item) => {
      const visible = !hiddenIds.eventHub.has(item.id);
      changed ||= !visible;
      return visible;
    }),
  };

  return changed ? filtered : data;
}

export function pruneHiddenClaimedIds(
  current: ClaimBucketIds,
  data: ClaimToolClaimablesDto | undefined,
): ClaimBucketIds {
  if (!data || !hasAnyIds(current)) {
    return current;
  }

  const next = createEmptyClaimBucketIds();
  let changed = false;
  for (const bucket of claimBuckets) {
    const idsInData = new Set(data[bucket].map((item) => item.id));
    for (const hiddenId of current[bucket]) {
      if (idsInData.has(hiddenId)) {
        next[bucket].add(hiddenId);
      } else {
        changed = true;
      }
    }
  }
  return changed ? next : current;
}

function cloneClaimBucketIds(ids: ClaimBucketIds): ClaimBucketIds {
  return {
    rewards: new Set(ids.rewards),
    missions: new Set(ids.missions),
    eventHub: new Set(ids.eventHub),
  };
}

function hasAnyIds(ids: ClaimBucketIds): boolean {
  return claimBuckets.some((bucket) => ids[bucket].size > 0);
}
