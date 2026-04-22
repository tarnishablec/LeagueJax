import { Suspense, useMemo } from "react";
import type { RouteObject } from "react-router";
import { createHashRouter, Navigate } from "react-router";
import { RouterProvider } from "react-router/dom";
import { SWRConfig } from "swr";
import { AppToaster } from "@/components/AppToaster";
import { getRouteContributions } from "@/features/registry";
import { UpdaterToastBridge } from "@/features/updater/components/UpdaterToastBridge";
import { MiniWindowLayout } from "@/layout/__mini";
import { MainWindowLayout } from "@/layout/__root";
import type { RouteContribution } from "@/runtime/web-contract";

const toRouteObject = (route: RouteContribution): RouteObject =>
  ({
    path: route.path,
    index: route.index,
    element: route.element,
    children: route.children?.map(toRouteObject),
  }) as RouteObject;

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

normalizeInitialHashRoute();

const isMiniRoute = (route: RouteObject): boolean => {
  if (typeof route.path !== "string") {
    return false;
  }

  return route.path === "mini" || route.path.startsWith("mini/");
};

export default function App() {
  const router = useMemo(() => {
    const shardRoutes = getRouteContributions().map(toRouteObject);
    const miniRoutes = shardRoutes.filter(isMiniRoute);
    const mainRoutes = shardRoutes.filter((route) => !isMiniRoute(route));

    return createHashRouter([
      {
        path: "/",
        element: <MiniWindowLayout />,
        children: [...miniRoutes],
      },
      {
        path: "/",
        element: <MainWindowLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/history" replace />,
          },
          ...mainRoutes,
        ],
      },
    ]);
  }, []);

  return (
    <SWRConfig value={{ revalidateOnFocus: false }}>
      <UpdaterToastBridge />
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
      <AppToaster />
    </SWRConfig>
  );
}
