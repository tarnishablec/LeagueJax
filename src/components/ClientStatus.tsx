/** @jsxImportSource solid-js */
import { Tooltip } from "@ark-ui/solid/tooltip";
import { keyArray } from "@solid-primitives/keyed";
import { invoke } from "@tauri-apps/api/core";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { LoaderCircle, Unlink, Unplug } from "lucide-solid";
import type { JSX } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { ProfileIcon } from "@/components/ProfileIcon";
import { SummonerID } from "@/components/SummonerID";
import { useSolidTranslation } from "@/i18n/solid";
import { selectIsFocused, useSolidLcuStore } from "../stores/lcu.solid";
import { tabStore } from "../stores/tabs.solid";
import * as s from "./ClientStatus.css.ts";

type ClientDisplayState = Exclude<LcuInstanceInfo["state"], "idle">;
const DETECTED_BADGE_TRANSITION_DELAY_MS = 200;
const HISTORY_ROUTE_PATH = "/main/history";

function normalizeState(state: LcuInstanceInfo["state"]): ClientDisplayState {
  return state === "idle" ? "authenticating" : state;
}

function renderInstanceStateLabel(
  state: ClientDisplayState,
  t: (key: string) => string,
): string | null {
  if (state === "authenticating") {
    return t("clientStatus.authenticating");
  }
  if (state === "closing") {
    return t("clientStatus.closing");
  }
  return null;
}

function TriggerIcon(props: {
  profileIconId: number | null | undefined;
  hasSummoner: boolean;
  isConnecting: boolean;
  collapsed: boolean;
  detectedClientCount: number;
  showCollapsedDetectedBadge: boolean;
}): JSX.Element {
  const [imageErrored, setImageErrored] = createSignal(false);
  const iconScaleClassName = createMemo(() =>
    s.iconScale({ collapsed: props.collapsed }),
  );

  return (
    <Show
      when={props.hasSummoner && !imageErrored()}
      fallback={
        <Show
          when={props.isConnecting}
          fallback={
            <span class={`${s.triggerIconFrame} ${iconScaleClassName()}`}>
              <Unplug
                size={16}
                aria-hidden="true"
                class={s.unplugIcon({
                  dimmed: props.showCollapsedDetectedBadge,
                })}
              />
              <Show when={props.collapsed && props.detectedClientCount > 0}>
                <span
                  class={s.collapsedDetectedBadge({
                    visible: props.showCollapsedDetectedBadge,
                  })}
                  aria-hidden={!props.showCollapsedDetectedBadge}
                >
                  {props.detectedClientCount}
                </span>
              </Show>
            </span>
          }
        >
          <span class={`${s.triggerIconFrame} ${iconScaleClassName()}`}>
            <LoaderCircle
              size={16}
              aria-hidden="true"
              class={s.connectingIcon}
            />
          </span>
        </Show>
      }
    >
      <ProfileIcon
        profileIconId={props.profileIconId}
        alt="Profile icon"
        className={`${s.avatar} ${iconScaleClassName()}`}
        style={assignInlineVars({
          [s.avatarSizeVar]: "20.8px",
        })}
        fallbackClassName={`${s.avatar} ${iconScaleClassName()}`}
        onError={() => setImageErrored(true)}
      />
    </Show>
  );
}

function TriggerLabel(props: {
  hasFocusedSummoner: boolean;
  summoner: LcuInstanceInfo["summoner"] | undefined;
  focusedState: ClientDisplayState | null;
  t: (key: string) => string;
}): JSX.Element {
  return (
    <Show
      when={props.hasFocusedSummoner && props.summoner}
      fallback={
        props.focusedState
          ? props.focusedState === "closing"
            ? props.t("clientStatus.closing")
            : props.t("clientStatus.authenticating")
          : props.t("common.disconnected")
      }
    >
      {(summoner) => <SummonerID summoner={summoner()} />}
    </Show>
  );
}

function ClientCardContent(props: {
  inst: LcuInstanceInfo;
  displayState: ClientDisplayState;
  isFocused: boolean;
  t: (key: string) => string;
}): JSX.Element {
  const hasSummoner = () => !!props.inst.summoner;
  const stateLabel = createMemo(() =>
    renderInstanceStateLabel(props.displayState, props.t),
  );

  return (
    <>
      <Show
        when={hasSummoner()}
        fallback={
          <div class={s.instanceIconFallback}>
            <Unplug size={14} aria-hidden="true" />
          </div>
        }
      >
        <ProfileIcon
          profileIconId={props.inst.summoner?.profileIconId}
          alt="Profile icon"
          className={s.instanceIcon}
          fallbackClassName={s.instanceIconFallback}
        />
      </Show>
      <div class={s.instanceInfo}>
        <span class={s.instancePath}>
          <Show
            when={props.inst.summoner}
            fallback={props.inst.installDir ?? `Port ${props.inst.port}`}
          >
            {(summoner) => <SummonerID summoner={summoner()} />}
          </Show>
        </span>
        <span class={s.instancePid}>
          PID: {props.inst.pid}
          {stateLabel() ? ` - ${stateLabel()}` : ""}
        </span>
      </div>
      <Show
        when={props.isFocused}
        fallback={
          <span
            class={s.stateIndicator({ state: props.displayState })}
            aria-hidden="true"
          />
        }
      >
        <button
          type="button"
          title={props.t("clientStatus.unfocus")}
          class={s.unfocusButton}
          onClick={(event) => {
            event.stopPropagation();
            void invoke("lcu_update_focus", { pid: null });
          }}
          aria-label="Disconnect focus"
        >
          <Unlink size={14} />
        </button>
      </Show>
    </>
  );
}

function LcuClientCard(props: {
  instance: LcuInstanceInfo;
  t: (key: string) => string;
}): JSX.Element {
  const displayState = () => normalizeState(props.instance.state);
  const content = () => (
    <ClientCardContent
      inst={props.instance}
      displayState={displayState()}
      isFocused={props.instance.isFocused}
      t={props.t}
    />
  );

  return (
    <Show
      when={!props.instance.isFocused}
      fallback={
        <div
          class={s.instanceRow({ focused: true })}
          title={props.instance.installDir ?? undefined}
        >
          {content()}
        </div>
      }
    >
      <Show
        when={props.instance.state === "ready"}
        fallback={
          <div
            class={s.instanceRow({ disabled: true })}
            title={props.instance.installDir ?? undefined}
          >
            {content()}
          </div>
        }
      >
        <button
          type="button"
          class={s.instanceRow({ clickable: true })}
          onClick={() =>
            void invoke("lcu_update_focus", { pid: props.instance.pid })
          }
          title={props.instance.installDir ?? undefined}
        >
          {content()}
        </button>
      </Show>
    </Show>
  );
}

function TooltipContent(props: {
  instances: LcuInstanceInfo[];
  t: (key: string) => string;
}): JSX.Element | null {
  if (props.instances.length === 0) {
    return null;
  }

  const instanceCards = keyArray(
    () => props.instances,
    (inst) => String(inst.pid),
    (inst) => <LcuClientCard instance={inst()} t={props.t} />,
  );

  return <div class={s.instanceList}>{instanceCards()}</div>;
}

interface ClientStatusProps {
  collapsed: boolean;
  iconSize: number;
}

export function ClientStatus(props: ClientStatusProps): JSX.Element {
  const { t } = useSolidTranslation();
  const focusedReady = useSolidLcuStore(selectIsFocused);
  const focusedInstance = useSolidLcuStore((state) =>
    state.instances.find((i) => i.isFocused),
  );
  const instances = useSolidLcuStore((state) => state.instances);
  const connectingInstance = useSolidLcuStore((state) =>
    state.instances.find((i) => i.state !== "ready" && i.state !== "closing"),
  );
  const detectedClientCount = createMemo(() => instances().length);
  const activeInstance = createMemo(
    () => focusedInstance() ?? connectingInstance(),
  );
  const focusedDisplayState = createMemo(() =>
    activeInstance() ? normalizeState(activeInstance()?.state ?? "idle") : null,
  );

  const summoner = createMemo(() => focusedReady()?.summoner);
  const hasFocusedSummoner = createMemo(() => !!(focusedReady() && summoner()));
  const isConnecting = createMemo(
    () => !!activeInstance() && !hasFocusedSummoner(),
  );
  const [canShowExpandedDetectedBadge, setCanShowExpandedDetectedBadge] =
    createSignal(false);
  const [canShowCollapsedDetectedBadge, setCanShowCollapsedDetectedBadge] =
    createSignal(false);

  createEffect(() => {
    setCanShowExpandedDetectedBadge(false);
    setCanShowCollapsedDetectedBadge(false);

    const timer = window.setTimeout(() => {
      if (props.collapsed) {
        setCanShowCollapsedDetectedBadge(true);
        return;
      }

      setCanShowExpandedDetectedBadge(true);
    }, DETECTED_BADGE_TRANSITION_DELAY_MS);

    onCleanup(() => window.clearTimeout(timer));
  });

  const hasDetectedClientWithoutFocus = createMemo(
    () => !hasFocusedSummoner() && detectedClientCount() > 0,
  );
  const shouldShowDetectedBadge = createMemo(
    () =>
      !props.collapsed &&
      canShowExpandedDetectedBadge() &&
      hasDetectedClientWithoutFocus(),
  );
  const shouldShowCollapsedDetectedBadge = createMemo(
    () =>
      props.collapsed &&
      canShowCollapsedDetectedBadge() &&
      hasDetectedClientWithoutFocus() &&
      !isConnecting(),
  );
  const hasInstances = createMemo(() => instances().length > 0);
  const shouldShowTooltip = createMemo(() => hasInstances() || props.collapsed);

  const handleClick = () => {
    const activeSummoner = summoner();
    if (!activeSummoner) {
      return;
    }

    if (!window.location.hash.startsWith(`#${HISTORY_ROUTE_PATH}`)) {
      window.location.hash = HISTORY_ROUTE_PATH;
    }
    tabStore.getState().openTab(activeSummoner.puuid);
  };

  return (
    <div class={s.container}>
      <Tooltip.Root
        lazyMount
        unmountOnExit
        disabled={!shouldShowTooltip()}
        openDelay={0}
        closeDelay={80}
        positioning={{ placement: "right", gutter: 8 }}
      >
        <Tooltip.Trigger
          asChild={(getTriggerProps) => (
            <button
              {...getTriggerProps({
                type: "button",
                class: s.trigger({ collapsed: props.collapsed }),
                onClick: handleClick,
              })}
            >
              <TriggerIcon
                profileIconId={
                  hasFocusedSummoner() ? summoner()?.profileIconId : null
                }
                hasSummoner={hasFocusedSummoner()}
                isConnecting={isConnecting()}
                collapsed={props.collapsed}
                detectedClientCount={detectedClientCount()}
                showCollapsedDetectedBadge={shouldShowCollapsedDetectedBadge()}
              />
              <span class={s.label({ collapsed: props.collapsed })}>
                <TriggerLabel
                  hasFocusedSummoner={hasFocusedSummoner()}
                  summoner={summoner()}
                  focusedState={focusedDisplayState()}
                  t={t}
                />
              </span>
              <Show when={shouldShowDetectedBadge()}>
                <span class={s.detectedBadge}>{detectedClientCount()}</span>
              </Show>
            </button>
          )}
        />

        <Portal>
          <Tooltip.Positioner>
            <Tooltip.Content
              class={hasInstances() ? s.tooltip : s.emptyTooltip}
            >
              <Show
                when={hasInstances()}
                fallback={t("clientStatus.noClients")}
              >
                <TooltipContent instances={instances()} t={t} />
              </Show>
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Portal>
      </Tooltip.Root>
    </div>
  );
}
