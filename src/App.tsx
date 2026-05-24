/** @jsxImportSource solid-js */
import { HashRouter, Navigate } from "@solidjs/router";
import { createMemo, type JSX } from "solid-js";
import { AppToaster } from "@/components/AppToaster";
import { MainWindowLayout } from "@/layout/__root";
import { toSolidRouteDefinition } from "@/runtime/solid-router";
import { getSolidRouteContributions } from "./features/solid-registry";

function normalizeInitialHashRoute(): void {
  if (window.location.hash.length > 0) {
    return;
  }

  const path = window.location.pathname;
  if (path === "/" || path === "/index.html") {
    return;
  }

  window.history.replaceState(
    null,
    "",
    `/#${path}${window.location.search}${window.location.hash}`,
  );
}

function MainIndexRedirect(): JSX.Element {
  return <Navigate href="/main/history" />;
}

normalizeInitialHashRoute();

export default function App(): JSX.Element {
  const routes = createMemo(() => {
    const mainRoutes = getSolidRouteContributions("main").map(
      toSolidRouteDefinition,
    );

    return [
      {
        path: "/",
        component: MainIndexRedirect,
      },
      {
        path: "/main",
        component: MainWindowLayout,
        children: [
          {
            component: MainIndexRedirect,
          },
          ...mainRoutes,
        ],
      },
    ];
  });

  return (
    <>
      <HashRouter>{routes()}</HashRouter>
      <AppToaster />
    </>
  );
}
