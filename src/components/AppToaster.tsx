/** @jsxImportSource solid-js */
import { Toast, Toaster, type ToastOptions } from "@ark-ui/solid/toast";
import {
  CircleCheck,
  CircleX,
  Info,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-solid";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import * as s from "./AppToaster.css.ts";
import { solidAppToaster } from "./toastStore";

type ToastTone = "error" | "info" | "loading" | "success" | "warning";

const getToastMeta = (toast: ToastOptions): Record<string, unknown> => {
  return toast.meta && typeof toast.meta === "object"
    ? (toast.meta as Record<string, unknown>)
    : {};
};

const getNavigateTarget = (toast: ToastOptions): string | null => {
  const navigateTo = getToastMeta(toast).navigateTo;
  return typeof navigateTo === "string" ? navigateTo : null;
};

const shouldHideIcon = (toast: ToastOptions): boolean => {
  return getToastMeta(toast).hideIcon === true;
};

const shouldShowClose = (toast: ToastOptions): boolean => {
  return toast.closable !== false && getToastMeta(toast).hideClose !== true;
};

const getToastTone = (toast: ToastOptions): ToastTone => {
  switch (toast.type) {
    case "error":
      return "error";
    case "loading":
      return "loading";
    case "success":
      return "success";
    case "warning":
      return "warning";
    default:
      return "info";
  }
};

const getLayoutClass = (showIcon: boolean, showClose: boolean): string => {
  if (showIcon && showClose) {
    return s.rootLayout.balanced;
  }

  if (showIcon) {
    return s.rootLayout.iconOnly;
  }

  if (showClose) {
    return s.rootLayout.closeOnly;
  }

  return s.rootLayout.contentOnly;
};

function TypeIcon(props: { tone: ToastTone }): JSX.Element {
  const className = props.tone === "loading" ? s.loadingIcon : undefined;

  switch (props.tone) {
    case "error":
      return <CircleX size={16} aria-hidden="true" />;
    case "loading":
      return <LoaderCircle size={16} aria-hidden="true" class={className} />;
    case "success":
      return <CircleCheck size={16} aria-hidden="true" />;
    case "warning":
      return <TriangleAlert size={16} aria-hidden="true" />;
    case "info":
      return <Info size={16} aria-hidden="true" />;
  }
}

const currentRouteRoot = (): "/main" | "/mini" => {
  return window.location.hash.startsWith("#/mini") ? "/mini" : "/main";
};

const isInCurrentRouteRoot = (path: string): boolean => {
  const root = currentRouteRoot();
  return path === root || path.startsWith(`${root}/`);
};

export function AppToaster(): JSX.Element {
  return (
    <Toaster
      toaster={solidAppToaster}
      class={s.group}
      aria-label="Notifications"
    >
      {(toastAccessor) => {
        const toast = toastAccessor();
        const navigateTo = getNavigateTarget(toast);
        const tone = getToastTone(toast);
        const showIcon = !shouldHideIcon(toast);
        const showClose = shouldShowClose(toast);
        const isClickable =
          navigateTo !== null && isInCurrentRouteRoot(navigateTo);

        const navigate = () => {
          if (!navigateTo || !isInCurrentRouteRoot(navigateTo)) {
            return;
          }

          window.location.hash = navigateTo;
        };

        const handleRootKeyDown = (event: KeyboardEvent) => {
          if (!isClickable) {
            return;
          }

          if (event.key !== "Enter" && event.key !== " ") {
            return;
          }

          event.preventDefault();
          navigate();
        };

        return (
          <Toast.Root
            class={`${s.root} ${getLayoutClass(showIcon, showClose)} ${
              isClickable ? s.rootClickable : ""
            }`}
            onClick={isClickable ? navigate : undefined}
            onKeyDown={isClickable ? handleRootKeyDown : undefined}
            tabIndex={isClickable ? 0 : undefined}
          >
            <Show when={showIcon}>
              <div class={`${s.iconSlot} ${s.iconTone[tone]}`}>
                <TypeIcon tone={tone} />
              </div>
            </Show>

            <div class={s.body}>
              <Show when={toast.title}>
                <Toast.Title class={s.title}>{toast.title}</Toast.Title>
              </Show>
              <Show when={toast.description}>
                <Toast.Description class={s.description}>
                  {toast.description}
                </Toast.Description>
              </Show>
              <Show when={toast.action}>
                {(action) => (
                  <Toast.ActionTrigger class={s.actionButton}>
                    {action().label}
                  </Toast.ActionTrigger>
                )}
              </Show>
            </div>

            <Show when={showClose}>
              <Toast.CloseTrigger
                aria-label="Dismiss notification"
                class={s.closeButton}
              >
                <X size={14} aria-hidden="true" />
              </Toast.CloseTrigger>
            </Show>
          </Toast.Root>
        );
      }}
    </Toaster>
  );
}
