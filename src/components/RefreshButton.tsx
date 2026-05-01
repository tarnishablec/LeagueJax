import { Loader, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as s from "./RefreshButton.css";

export function RefreshButton({
  loading,
  disabled,
  onClick,
  ariaLabel,
  size = 14,
  className,
  minLoadingMs = 0,
}: {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel: string;
  size?: number;
  className?: string;
  minLoadingMs?: number;
}) {
  const [isLoadingVisible, setIsLoadingVisible] = useState(Boolean(loading));
  const loadingStartedAtRef = useRef<number | null>(
    loading ? Date.now() : null,
  );

  useEffect(() => {
    if (loading) {
      loadingStartedAtRef.current = Date.now();
      setIsLoadingVisible(true);
      return;
    }

    const startedAt = loadingStartedAtRef.current;
    const elapsed = startedAt ? Date.now() - startedAt : minLoadingMs;
    const remainingMs = Math.max(0, minLoadingMs - elapsed);

    if (remainingMs <= 0) {
      loadingStartedAtRef.current = null;
      setIsLoadingVisible(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      loadingStartedAtRef.current = null;
      setIsLoadingVisible(false);
    }, remainingMs);

    return () => window.clearTimeout(timeoutId);
  }, [loading, minLoadingMs]);

  return (
    <button
      type="button"
      className={className ? `${s.root} ${className}` : s.root}
      aria-label={ariaLabel}
      disabled={disabled || isLoadingVisible}
      onClick={onClick}
    >
      {isLoadingVisible ? (
        <Loader size={size} className={s.iconSpin} />
      ) : (
        <RefreshCw size={size} />
      )}
    </button>
  );
}
