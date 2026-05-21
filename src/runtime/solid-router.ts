import type { RouteDefinition } from "@solidjs/router";
import type { SolidRouteContribution } from "./solid-web-contract";

export function toSolidRouteDefinition(
  route: SolidRouteContribution,
): RouteDefinition {
  const definition: RouteDefinition = {
    component: route.component,
  };

  if (!route.index && route.path != null) {
    definition.path = route.path;
  }

  if (route.children) {
    definition.children = route.children.map(toSolidRouteDefinition);
  }

  return definition;
}
