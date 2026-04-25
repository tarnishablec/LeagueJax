import { Toast, Toaster, type ToastOptions } from "@ark-ui/react/toast";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LoaderCircle,
  X,
  XCircle,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import * as s from "./AppToaster.css";
import { appToaster } from "./toastStore";

type ToastTone = "error" | "info" | "loading" | "success" | "warning";

const getNavigateTarget = (toast: ToastOptions): string | null => {
  const navigateTo = toast.meta?.navigateTo;
  return typeof navigateTo === "string" ? navigateTo : null;
};

const shouldHideIcon = (toast: ToastOptions): boolean => {
  return toast.meta?.hideIcon === true;
};

const shouldShowClose = (toast: ToastOptions): boolean => {
  return toast.closable !== false && toast.meta?.hideClose !== true;
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

const TypeIcon = ({ tone }: { tone: ToastTone }) => {
  const className = tone === "loading" ? s.loadingIcon : undefined;

  switch (tone) {
    case "error":
      return <XCircle size={16} aria-hidden="true" />;
    case "loading":
      return (
        <LoaderCircle size={16} aria-hidden="true" className={className} />
      );
    case "success":
      return <CheckCircle2 size={16} aria-hidden="true" />;
    case "warning":
      return <AlertTriangle size={16} aria-hidden="true" />;
    case "info":
      return <Info size={16} aria-hidden="true" />;
  }
};

const currentRouteRoot = (): "/main" | "/mini" => {
  return window.location.hash.startsWith("#/mini") ? "/mini" : "/main";
};

const isInCurrentRouteRoot = (path: string): boolean => {
  const root = currentRouteRoot();
  return path === root || path.startsWith(`${root}/`);
};

export function AppToaster() {
  return (
    <Toaster
      toaster={appToaster}
      className={s.group}
      aria-label="Notifications"
    >
      {/** biome-ignore lint/complexity/noExcessiveCognitiveComplexity: render callback intentionally keeps toast layout, accessibility, and navigation logic colocated */}
      {(toast: ToastOptions) => {
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

        const handleRootKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
            className={`${s.root} ${getLayoutClass(showIcon, showClose)} ${
              isClickable ? s.rootClickable : ""
            }`}
            onClick={isClickable ? navigate : undefined}
            onKeyDown={isClickable ? handleRootKeyDown : undefined}
            tabIndex={isClickable ? 0 : undefined}
          >
            {showIcon ? (
              <div className={`${s.iconSlot} ${s.iconTone[tone]}`}>
                <TypeIcon tone={tone} />
              </div>
            ) : null}

            <div className={s.body}>
              {toast.title ? (
                <Toast.Title className={s.title}>{toast.title}</Toast.Title>
              ) : null}
              {toast.description ? (
                <Toast.Description className={s.description}>
                  {toast.description}
                </Toast.Description>
              ) : null}
              {toast.action ? (
                <Toast.ActionTrigger className={s.actionButton}>
                  {toast.action.label}
                </Toast.ActionTrigger>
              ) : null}
            </div>

            {showClose ? (
              <Toast.CloseTrigger
                aria-label="Dismiss notification"
                className={s.closeButton}
              >
                <X size={14} aria-hidden="true" />
              </Toast.CloseTrigger>
            ) : null}
          </Toast.Root>
        );
      }}
    </Toaster>
  );
}
