import { useMemo } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { RouterProvider } from "react-router/dom";
import { getRouteContributions } from "@/features/registry";
import { RootLayout } from "@/layout/__root";

export default function App() {
  const router = useMemo(() => {
    const shardRoutes = getRouteContributions().map((route) => ({
      path: route.path,
      index: route.index,
      element: route.element,
    }));

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
