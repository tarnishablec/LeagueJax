import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import * as s from "./SettingsHub.css";
import type { PageEntry } from "./settings-view-model";

interface SettingsPageTabsProps {
  pages: PageEntry[];
}

export function SettingsPageTabs({ pages }: SettingsPageTabsProps) {
  const { t } = useTranslation();

  return (
    <div className={s.pageTabs}>
      {pages.map((page) => (
        <NavLink
          key={page.id}
          to={`/settings/${page.id}`}
          className={({ isActive }) => (isActive ? s.pageTabActive : s.pageTab)}
        >
          {t(`settings.pages.${page.id}.title`, { defaultValue: page.id })}
        </NavLink>
      ))}
    </div>
  );
}
