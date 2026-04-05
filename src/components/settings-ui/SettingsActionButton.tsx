import * as s from "./SettingsActionButton.css";

interface SettingsActionButtonProps {
  ariaLabel: string;
  label: string;
  onClick: () => void;
}

export function SettingsActionButton({
  ariaLabel,
  label,
  onClick,
}: SettingsActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={s.button}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
