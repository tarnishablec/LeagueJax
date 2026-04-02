import { Carousel } from "@ark-ui/react/carousel";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ShardInfoDto, ShardsSnapshotDto } from "@/bindings/shards";
import { getJaxRuntime } from "@/features/registry";
import { ShardsDag } from "../components/ShardsDag";
import { ShardsTable } from "../components/ShardsTable";
import * as s from "./ShardsPage.css";

type Side = "frontend" | "backend";

function buildFrontendShards(): ShardInfoDto[] {
  const jax = getJaxRuntime();
  const shards = jax.listShards();
  const report = jax.getStartupReport();

  const failedIds = new Set(report?.failed.map((f) => f.id) ?? []);
  const skippedIds = new Set(report?.skipped ?? []);

  return shards.map((shard) => {
    const id = shard.id();
    const deps = shard.dependsOn?.() ?? [];
    const durationMs = report?.durations.get(id) ?? null;

    let status: ShardInfoDto["status"];
    if (failedIds.has(id)) {
      status = { kind: "failed", error: "Setup failed" };
    } else if (skippedIds.has(id)) {
      status = { kind: "skipped" };
    } else {
      status = { kind: "running" };
    }

    return {
      id: String(id),
      label: shard.label(),
      status,
      dependencies: deps.map(String),
      setupDurationMs: durationMs,
    };
  });
}

export function ShardsPage() {
  const { t } = useTranslation();
  const [side, setSide] = useState<Side>("frontend");
  const [backendSnapshot, setBackendSnapshot] =
    useState<ShardsSnapshotDto | null>(null);

  useEffect(() => {
    invoke<ShardsSnapshotDto>("get_shards_status")
      .then(setBackendSnapshot)
      .catch(() => {});

    let cancelled = false;
    const unlistenPromise = listen<ShardsSnapshotDto>(
      "shards_status_changed",
      (event) => {
        if (!cancelled) setBackendSnapshot(event.payload);
      },
    );

    return () => {
      cancelled = true;
      unlistenPromise.then((fn) => fn());
    };
  }, []);

  const frontendShards = useMemo(() => buildFrontendShards(), []);
  const backendShards = backendSnapshot?.shards ?? [];
  const activeShards = side === "frontend" ? frontendShards : backendShards;

  const labelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const shard of activeShards) {
      map.set(shard.id, shard.label);
    }
    return map;
  }, [activeShards]);

  return (
    <div className={s.shardsPage}>
      <Carousel.Root slideCount={2} defaultPage={0} className={s.carouselRoot}>
        <div className={s.toolbar}>
          <div className={s.segmentGroup}>
            <button
              type="button"
              className={side === "frontend" ? s.segmentActive : s.segment}
              onClick={() => setSide("frontend")}
            >
              {t("settings.shards.frontendTab")}
            </button>
            <button
              type="button"
              className={side === "backend" ? s.segmentActive : s.segment}
              onClick={() => setSide("backend")}
            >
              {t("settings.shards.backendTab")}
            </button>
          </div>

          <div />

          <Carousel.Context>
            {(api) => (
              <div className={s.segmentGroup}>
                <button
                  type="button"
                  className={api.page === 0 ? s.segmentActive : s.segment}
                  onClick={() => api.scrollToIndex(0)}
                >
                  {t("settings.shards.viewTable")}
                </button>
                <button
                  type="button"
                  className={api.page === 1 ? s.segmentActive : s.segment}
                  onClick={() => api.scrollToIndex(1)}
                >
                  {t("settings.shards.viewGraph")}
                </button>
              </div>
            )}
          </Carousel.Context>
        </div>

        <Carousel.ItemGroup className={s.carouselItemGroup}>
          <Carousel.Item index={0} className={s.carouselItem}>
            <ShardsTable shards={activeShards} labelMap={labelMap} />
          </Carousel.Item>
          <Carousel.Item index={1} className={s.carouselItem}>
            <ShardsDag shards={activeShards} />
          </Carousel.Item>
        </Carousel.ItemGroup>
      </Carousel.Root>
    </div>
  );
}
