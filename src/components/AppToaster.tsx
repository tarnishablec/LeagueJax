import { Toast, Toaster, type ToastOptions } from "@ark-ui/react/toast";
import { X } from "lucide-react";
import type { KeyboardEvent } from "react";
import * as s from "./AppToaster.css";
import { appToaster } from "./toastStore";

const getNavigateTarget = (toast: ToastOptions): string | null => {
  const navigateTo = toast.meta?.navigateTo;
  return typeof navigateTo === "string" ? navigateTo : null;
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
      {(toast: ToastOptions) => {
        const navigateTo = getNavigateTarget(toast);
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
            className={`${s.root} ${isClickable ? s.rootClickable : ""}`}
            onClick={isClickable ? navigate : undefined}
            onKeyDown={isClickable ? handleRootKeyDown : undefined}
            tabIndex={isClickable ? 0 : undefined}
          >
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

            {toast.closable ? (
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
