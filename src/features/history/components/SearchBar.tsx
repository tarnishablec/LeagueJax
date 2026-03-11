import { useState } from "react";
import { useTranslation } from "react-i18next";
import * as s from "./SearchBar.css";

interface SearchBarProps {
  onSearch: (gameName: string, tagLine: string) => void;
  isLoading?: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    const hashIndex = trimmed.lastIndexOf("#");
    if (hashIndex === -1 || hashIndex === 0 || hashIndex === trimmed.length - 1)
      return;
    onSearch(trimmed.slice(0, hashIndex), trimmed.slice(hashIndex + 1));
  };

  return (
    <div className={s.wrapper}>
      <input
        type="text"
        className={s.input}
        placeholder={t("history.searchPlaceholder")}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />
      <button
        type="button"
        className={s.button}
        disabled={isLoading || !value.includes("#")}
        onClick={handleSubmit}
      >
        {t("history.search")}
      </button>
    </div>
  );
}
