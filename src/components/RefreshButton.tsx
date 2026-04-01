import { Loader, RefreshCw } from "lucide-react";
import * as s from "./RefreshButton.css";

export function RefreshButton({
  loading,
  disabled,
  onClick,
  ariaLabel,
  size = 14,
  className,
}: {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel: string;
  size?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className ? `${s.root} ${className}` : s.root}
      aria-label={ariaLabel}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <Loader size={size} className={s.iconSpin} />
      ) : (
        <RefreshCw size={size} />
      )}
    </button>
  );
}
