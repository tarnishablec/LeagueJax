import { Loader } from "lucide-react";
import { useState } from "react";
import * as s from "./SettingsActionButton.css";

interface SettingsActionButtonProps {
  ariaLabel: string;
  label: string;
  onClick: () => void | Promise<unknown>;
  onError?: (error: unknown) => void;
}

export function SettingsActionButton({
  ariaLabel,
  label,
  onClick,
  onError,
}: SettingsActionButtonProps) {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (pending) {
      return;
    }

    setPending(true);

    try {
      await onClick();
    } catch (error) {
      onError?.(error);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={s.button}
      disabled={pending}
      onClick={() => {
        void handleClick();
      }}
    >
      <span className={s.label}>{label}</span>
      <span className={s.loaderSlot} aria-hidden="true">
        <Loader
          size={14}
          className={pending ? s.iconSpin : s.loaderHidden}
        />
      </span>
    </button>
  );
}
