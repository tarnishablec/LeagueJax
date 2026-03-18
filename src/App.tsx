import { createBrowserRouter, Navigate } from "react-router";
import { RouterProvider } from "react-router/dom";
import { getRouteContributions } from "@/features/registry";
import { RootLayout } from "@/routes/__root";

const shardRoutes = getRouteContributions().map((route) => ({
  path: route.path,
  index: route.index,
  element: route.element,
}));

const router = createBrowserRouter([
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

export default function App() {
  return <RouterProvider router={router} />;
}
