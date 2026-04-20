import { Loader } from "lucide-react";
import { useEffect, useState } from "react";
import * as s from "./SettingsActionButton.css";

interface SettingsActionButtonProps {
  ariaLabel: string;
  label: string;
  onClick: () => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  onError?: (error: unknown) => void;
  tone?: "accent" | "neutral";
}

export function SettingsActionButton({
  ariaLabel,
  disabled = false,
  label,
  loading = false,
  onClick,
  onError,
  tone = "accent",
}: SettingsActionButtonProps) {
  const [pending, setPending] = useState(false);
  const [displayLabel, setDisplayLabel] = useState(label);
  const [labelVisible, setLabelVisible] = useState(true);
  const busy = pending || loading;

  useEffect(() => {
    if (label === displayLabel) {
      setLabelVisible(true);
      return;
    }

    setLabelVisible(false);

    const swapTimer = setTimeout(() => {
      setDisplayLabel(label);
      setLabelVisible(true);
    }, s.labelFadeDurationMs);

    return () => {
      clearTimeout(swapTimer);
    };
  }, [displayLabel, label]);

  const handleClick = async () => {
    if (busy || disabled) {
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
      className={s.tone[tone]}
      disabled={busy || disabled}
      onClick={() => {
        void handleClick();
      }}
    >
      <span className={`${s.label} ${labelVisible ? "" : s.labelHidden}`}>
        {displayLabel}
      </span>
      <span className={s.loaderSlot} aria-hidden="true">
        <Loader size={14} className={busy ? s.iconSpin : s.loaderHidden} />
      </span>
    </button>
  );
}
