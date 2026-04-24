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
import type { RouteContribution, RouteLayout } from "@/runtime/web-contract";

const ROUTE_LAYOUTS: Record<
  RouteLayout,
  {
    path: string;
    element: RouteObject["element"];
    children: (routes: RouteObject[]) => RouteObject[];
  }
> = {
  main: {
    path: "/main",
    element: <MainWindowLayout />,
    children: (routes) => [
      {
        index: true,
        element: <Navigate to="/main/history" replace />,
      },
      ...routes,
    ],
  },
  mini: {
    path: "/mini",
    element: <MiniWindowLayout />,
    children: (routes) => routes,
  },
};
const ROUTE_LAYOUT_ORDER: RouteLayout[] = ["main", "mini"];

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

export default function App() {
  const router = useMemo(() => {
    const routeBuckets = getRouteContributions().reduce<
      Record<RouteLayout, RouteObject[]>
    >(
      (buckets, route) => {
        const layout = route.layout ?? "main";
        buckets[layout].push(toRouteObject(route));
        return buckets;
      },
      {
        main: [],
        mini: [],
      },
    );

    return createHashRouter([
      {
        path: "/",
        element: <Navigate to="/main/history" replace />,
      },
      ...ROUTE_LAYOUT_ORDER.map((layout) => {
        const config = ROUTE_LAYOUTS[layout];

        return {
          path: config.path,
          element: config.element,
          children: config.children(routeBuckets[layout]),
        };
      }),
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
