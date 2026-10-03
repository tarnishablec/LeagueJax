/** @jsxImportSource solid-js */
import type { OpggChampionDetailDto } from "@/bindings/opgg";
import { ChampionBuilds, ChampionSkills } from "./ChampionBuilds";
import { ChampionPanel } from "./ChampionPanel";

export function ChampionLoadout(props: {
  flowing: boolean;
  detail: OpggChampionDetailDto | undefined;
  loading: boolean;
  itemIcon: (id: number) => string | null;
  spellIcon: (id: number) => string | null;
}) {
  return (
    <>
      <ChampionPanel
        ariaLabel="Champion skills"
        flowing={props.flowing}
        scrollable
      >
        <ChampionSkills detail={props.detail} loading={props.loading} />
      </ChampionPanel>
      <ChampionPanel
        ariaLabel="Champion builds"
        flowing={props.flowing}
        scrollable
      >
        <ChampionBuilds
          detail={props.detail}
          loading={props.loading}
          itemIcon={props.itemIcon}
          spellIcon={props.spellIcon}
        />
      </ChampionPanel>
    </>
  );
}
