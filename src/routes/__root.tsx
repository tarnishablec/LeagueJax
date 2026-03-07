import {createRootRoute, Link, Outlet} from "@tanstack/react-router";
import {TanStackRouterDevtools} from "@tanstack/router-devtools";
import {Link as LinkIcon, PanelLeftClose, PanelLeftOpen, Unplug} from "lucide-react";
import React, {useState} from "react";
import {useTranslation} from "react-i18next";
import {JaxLogo} from "../components/JaxLogo";
import {ThemeToggle} from "../components/ThemeToggle";
import {TitleBar} from "../components/TitleBar";
import {getNavItems} from "../features/registry";
import {useLcuEvents} from "../hooks/use-lcu-events";
import {useTheme} from "../hooks/use-theme";
import {cn} from "../lib/utils";
import {useLcuStore} from "../stores/lcu";

// ─── Styles ───────────────────────────────────────────────────────────────────

// Expanded: icon + label grid row; Collapsed: icon centered and slightly enlarged
const NAV_BASE = "grid place-items-center gap-5 rounded-md h-9 text-sm text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground whitespace-nowrap overflow-hidden";

const NAV_EXPANDED =
    cn(NAV_BASE, "grid-cols-[2.5rem_1fr]");

const NAV_ACTIVE_EXPANDED =
    "bg-accent text-accent-foreground font-medium border-l-2 border-primary";

const NAV_COLLAPSED = cn(NAV_BASE, "gap-0 grid-cols-[1fr_0] justify-items-start");

const NAV_ACTIVE_COLLAPSED = "bg-primary/15 text-primary font-medium";

// ─── Layout ───────────────────────────────────────────────────────────────────

const mainNavItems = getNavItems("main");
const bottomNavItems = getNavItems("bottom");

function RootLayout() {
    const {t} = useTranslation();
    const connected = useLcuStore((s) => s.connected);
    const [collapsed, setCollapsed] = useState(false);

    useLcuEvents();
    useTheme();

    const navFinal = collapsed ? NAV_COLLAPSED : NAV_EXPANDED;
    const activeNav = collapsed ? NAV_ACTIVE_COLLAPSED : NAV_ACTIVE_EXPANDED;
    const iconSize = collapsed ? 20 : 16;

    const labelClass = collapsed ? "opacity-0" : "opacity-100";
    const iconClass = `transition-[width,height] duration-200 justify-self-center`;
    const listClass = `overflow-y-auto py-3 px-1 space-y-0.5 grid grid-flow-row content-start gap-1`

    return (
        <div
            className="grid h-screen grid-rows-[3rem_1fr] bg-transparent text-foreground transition-[grid-template-columns] duration-200 ease-in-out overflow-hidden"
            style={{gridTemplateColumns: collapsed ? "3rem 1fr" : "12rem 1fr"}}
        >
            {/* ── Sidebar logo / collapse toggle ── */}
            <button
                type="button"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="group relative grid place-items-center border-r border-b bg-transparent select-none overflow-hidden"
                onClick={() => setCollapsed((c) => !c)}
            >
                <JaxLogo
                    size={20}
                    className="transition-all duration-200 group-hover:opacity-0 group-hover:scale-75"
                />
                {collapsed ? (
                    <PanelLeftOpen
                        size={20}
                        aria-hidden="true"
                        className="absolute text-foreground/60 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 scale-75"
                    />
                ) : (
                    <PanelLeftClose
                        size={20}
                        aria-hidden="true"
                        className="absolute text-foreground/60 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 scale-75"
                    />
                )}
            </button>

            {/* ── Title bar ── */}
            <TitleBar tools={[<ThemeToggle key="theme-toggle"/>]}/>

            {/* ── Sidebar nav ── */}
            <aside className="grid grid-rows-[1fr_auto] border-r overflow-hidden">
                <nav className={listClass}>
                    {mainNavItems.map(({to, labelKey, icon: Icon}) => (
                        <Link
                            key={to}
                            to={to}
                            className={navFinal}
                            activeProps={{className: cn(navFinal, activeNav)}}
                        >
                            <Icon
                                size={iconSize}
                                aria-hidden="true"
                                className={iconClass}
                            />
                            <span
                                className={cn("truncate justify-self-start", labelClass)}>{t(labelKey)}</span>
                        </Link>
                    ))}
                </nav>

                {/* ── Sidebar bottom ── */}
                <div className={listClass}>
                    {
                        <div className={cn("hover:cursor-pointer", navFinal)}>
                            {connected ? (
                                <React.Fragment>
                                    <LinkIcon size={iconSize} aria-hidden="true" className={iconClass}/>
                                    <span
                                        className={cn("truncate justify-self-start", labelClass)}>t("common.connected")</span>
                                </React.Fragment>
                            ) : (
                                <React.Fragment>
                                    <Unplug size={iconSize} aria-hidden="true" className={iconClass}/>
                                    <span
                                        className={cn("truncate justify-self-start", labelClass)}>{t("common.disconnected")}</span>
                                </React.Fragment>
                            )}
                        </div>
                    }
                    {bottomNavItems.map(({to, labelKey, icon: Icon}) => (
                        <Link
                            key={to}
                            to={to}
                            className={navFinal}
                            activeProps={{className: cn(navFinal, activeNav)}}
                        >
                            <Icon
                                size={iconSize}
                                aria-hidden="true"
                                className={iconClass}
                            />
                            {!collapsed && (
                                <span className="text-left truncate justify-self-start">{t(labelKey)}</span>
                            )}
                        </Link>
                    ))}
                </div>
            </aside>

            {/* ── Main content ── */
            }
            <main className="overflow-auto p-6">
                <Outlet/>
            </main>

            {
                import.meta.env.DEV && (
                    <TanStackRouterDevtools position="bottom-right"/>
                )
            }
        </div>
    )
        ;
}

export const Route = createRootRoute({component: RootLayout});
