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
    const [name, tag] = trimmed.split("#");
    onSearch(name, tag);
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
        className={s.searchButton}
        disabled={isLoading || !value.includes("#")}
        onClick={handleSubmit}
      >
        {t("history.search")}
      </button>
    </div>
  );
}
