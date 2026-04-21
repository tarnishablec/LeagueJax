import { Check, Loader } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as s from "./SettingsActionButton.css";

const defaultSuccessFeedbackDurationMs = 1000;

interface SettingsActionButtonProps {
  ariaLabel: string;
  label: string;
  onClick: () => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  minLoadingMs?: number;
  successFeedback?: boolean;
  onError?: (error: unknown) => void;
  tone?: "accent" | "neutral" | "quiet";
}

export function SettingsActionButton({
  ariaLabel,
  disabled = false,
  label,
  loading = false,
  minLoadingMs = 0,
  successFeedback = false,
  onClick,
  onError,
  tone = "accent",
}: SettingsActionButtonProps) {
  const [pending, setPending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [displayLabel, setDisplayLabel] = useState(label);
  const [labelVisible, setLabelVisible] = useState(true);
  const successTimerRef = useRef<number | null>(null);
  const busy = pending || loading;

  useEffect(() => {
    return () => {
      if (successTimerRef.current != null) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

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

    if (successTimerRef.current != null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setShowSuccess(false);

    const startedAt = performance.now();
    setPending(true);
    let completedSuccessfully = false;

    try {
      await onClick();
      completedSuccessfully = true;
    } catch (error) {
      onError?.(error);
    } finally {
      const elapsedMs = performance.now() - startedAt;
      const remainingMs = Math.max(0, minLoadingMs - elapsedMs);
      if (remainingMs > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, remainingMs);
        });
      }
      setPending(false);

      if (completedSuccessfully && successFeedback) {
        setShowSuccess(true);
        successTimerRef.current = window.setTimeout(() => {
          setShowSuccess(false);
          successTimerRef.current = null;
        }, defaultSuccessFeedbackDurationMs);
      }
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
        <Loader
          size={14}
          className={`${s.feedbackIconBase} ${busy ? s.feedbackIconVisible : ""} ${busy ? s.iconSpin : ""}`}
        />
        <Check
          size={14}
          className={`${s.feedbackIconBase} ${showSuccess ? s.feedbackIconVisible : ""}`}
        />
      </span>
    </button>
  );
}
