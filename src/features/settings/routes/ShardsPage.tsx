/** @jsxImportSource solid-js */
import { Carousel } from "@ark-ui/solid/carousel";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { JSX } from "solid-js";
import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
import type { ShardInfoDto, ShardsSnapshotDto } from "@/bindings/shards";
import { ScrollArea } from "@/components/scroll-area/ScrollArea";
import { getSolidJaxRuntime } from "@/features/solid-registry";
import { useSolidTranslation } from "@/i18n/solid";
import { ShardsDag } from "../components/ShardsDag";
import { ShardsTable } from "../components/ShardsTable";
import * as s from "./ShardsPage.css.ts";

type Side = "frontend" | "backend";

function buildFrontendShards(): ShardInfoDto[] {
  const jax = getSolidJaxRuntime();
  const shards = jax.listShards();
  const report = jax.getStartupReport();

  const failedIds = new Set(report?.failed.map((failed) => failed.id) ?? []);
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

export function ShardsPage(): JSX.Element {
  const { t } = useSolidTranslation();
  const [side, setSide] = createSignal<Side>("frontend");
  const [backendSnapshot, setBackendSnapshot] =
    createSignal<ShardsSnapshotDto | null>(null);
  const frontendShards = createMemo(() => buildFrontendShards());
  const backendShards = createMemo(() => backendSnapshot()?.shards ?? []);
  const activeShards = createMemo(() =>
    side() === "frontend" ? frontendShards() : backendShards(),
  );
  const labelMap = createMemo(() => {
    const map = new Map<string, string>();
    for (const shard of activeShards()) {
      map.set(shard.id, shard.label);
    }
    return map;
  });

  onMount(() => {
    invoke<ShardsSnapshotDto>("get_shards_status")
      .then(setBackendSnapshot)
      .catch(() => {});

    let cancelled = false;
    const unlistenPromise = listen<ShardsSnapshotDto>(
      "shards_status_changed",
      (event) => {
        if (!cancelled) {
          setBackendSnapshot(event.payload);
        }
      },
    );

    onCleanup(() => {
      cancelled = true;
      unlistenPromise.then((unlisten) => unlisten()).catch(() => {});
    });
  });

  return (
    <div class={s.shardsPage}>
      <Carousel.Root slideCount={2} defaultPage={0} class={s.carouselRoot}>
        <div class={s.toolbar}>
          <div class={s.segmentGroup}>
            <button
              type="button"
              class={side() === "frontend" ? s.segmentActive : s.segment}
              onClick={() => setSide("frontend")}
            >
              {t("settings.shards.frontendTab")}
            </button>
            <button
              type="button"
              class={side() === "backend" ? s.segmentActive : s.segment}
              onClick={() => setSide("backend")}
            >
              {t("settings.shards.backendTab")}
            </button>
          </div>

          <div />

          <Carousel.Context>
            {(api) => (
              <div class={s.segmentGroup}>
                <button
                  type="button"
                  class={api().page === 0 ? s.segmentActive : s.segment}
                  onClick={() => api().scrollToIndex(0)}
                >
                  {t("settings.shards.viewTable")}
                </button>
                <button
                  type="button"
                  class={api().page === 1 ? s.segmentActive : s.segment}
                  onClick={() => api().scrollToIndex(1)}
                >
                  {t("settings.shards.viewGraph")}
                </button>
              </div>
            )}
          </Carousel.Context>
        </div>

        <Carousel.ItemGroup class={s.carouselItemGroup}>
          <Carousel.Item index={0} class={s.carouselItem}>
            <ScrollArea
              className={s.tablePane}
              contentClassName={s.tablePaneContent}
              direction="both"
              mode="overlay"
            >
              <ShardsTable shards={activeShards()} labelMap={labelMap()} />
            </ScrollArea>
          </Carousel.Item>
          <Carousel.Item index={1} class={s.carouselItem}>
            <ShardsDag shards={activeShards()} />
          </Carousel.Item>
        </Carousel.ItemGroup>
      </Carousel.Root>
    </div>
  );
}

export default ShardsPage;
