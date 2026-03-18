import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as s from "./SettingsSelect.css";

interface SettingsSelectOption {
  value: string;
  label: string;
}

interface SettingsSelectProps {
  ariaLabel: string;
  value: string;
  options: SettingsSelectOption[];
  onValueChange: (value: string) => void;
}

export function SettingsSelect({
  ariaLabel,
  value,
  options,
  onValueChange,
}: SettingsSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => {
    const selected = options.find((option) => option.value === value);
    return selected?.label ?? options[0]?.label ?? "";
  }, [options, value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={s.root}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={s.trigger({ open })}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={s.value}>{selectedLabel}</span>
        <ChevronDown size={14} aria-hidden="true" className={s.chevron({ open })} />
      </button>

      {open ? (
        <div role="listbox" aria-label={ariaLabel} className={s.menu}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={s.option({ selected })}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
