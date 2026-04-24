import { MapPinned } from "lucide-react";
import { LcuImage } from "@/components/LcuImage";
import {
  type MiniWindowScene,
  useMiniWindowModel,
} from "../hooks/use-mini-window-model";
import * as s from "./MiniRoute.css";

function sceneLabel(scene: MiniWindowScene): string {
  switch (scene) {
    case "matchmaking":
      return "Matchmaking";
    case "ongoing":
      return "Ongoing";
    case "idle":
      return "Idle";
  }
}

export function MiniRoute() {
  const model = useMiniWindowModel();

  return (
    <section className={s.root}>
      <div className={s.hero}>
        <div className={s.mapIconFrame}>
          {model.mapIconSrc ? (
            <LcuImage
              className={s.mapImage}
              src={model.mapIconSrc}
              alt="Map icon"
            />
          ) : (
            <MapPinned className={s.mapFallback} size={28} aria-hidden="true" />
          )}
        </div>

        <div className={s.meta}>
          <span className={s.scene}>{sceneLabel(model.scene)}</span>
          <strong className={s.mode}>{model.modeName}</strong>
          <span className={s.phase}>{model.phaseText}</span>
          {model.mapName ? (
            <span className={s.mapName}>{model.mapName}</span>
          ) : null}
        </div>
      </div>

      <footer className={s.footer}>
        <span className={s.footerLabel}>Auto Accept</span>
        <span className={s.footerValue}>{model.autoAcceptText}</span>
      </footer>
    </section>
  );
}
