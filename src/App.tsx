import { useMemo } from "react";
import type { RouteObject } from "react-router";
import { createBrowserRouter, Navigate } from "react-router";
import { RouterProvider } from "react-router/dom";
import { getRouteContributions } from "@/features/registry";
import { RootLayout } from "@/layout/__root";
import type { RouteContribution } from "@/runtime/web-contract";

const toRouteObject = (route: RouteContribution): RouteObject => ({
  path: route.path,
  index: route.index,
  element: route.element,
  children: route.children?.map(toRouteObject),
});

export default function App() {
  const router = useMemo(() => {
    const shardRoutes = getRouteContributions().map(toRouteObject);

    return createBrowserRouter([
      {
        path: "/",
        element: <RootLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/history" replace />,
          },
          ...shardRoutes,
        ],
      },
    ]);
  }, []);

  return <RouterProvider router={router} />;
}
