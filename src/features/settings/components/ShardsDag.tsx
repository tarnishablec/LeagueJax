/** @jsxImportSource solid-js */
import dagre from "@dagrejs/dagre";
import {
  Background,
  createEdgeStore,
  createNodeStore,
  type Edge,
  MarkerType,
  type Node,
  SolidFlow,
  SolidFlowProvider,
  useSolidFlow,
} from "@dschz/solid-flow";
import "@dschz/solid-flow/styles";
import { Maximize2 } from "lucide-solid";
import type { JSX } from "solid-js";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import { reconcile } from "solid-js/store";
import type { ShardInfoDto } from "@/bindings/shards";
import * as s from "./ShardsDag.css.ts";

interface ShardsDagProps {
  shards: ShardInfoDto[];
}

type ShardNode = Node<{ label: string }, "default">;
type ShardEdge = Edge<Record<string, unknown>, "default">;

interface ShardsGraph {
  nodes: ShardNode[];
  edges: ShardEdge[];
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 50;

function getStatusColor(status: ShardInfoDto["status"]): string {
  switch (status.kind) {
    case "running":
      return "oklch(0.72 0.15 155)";
    case "failed":
      return "oklch(0.65 0.25 27)";
    case "skipped":
      return "oklch(0.55 0 0)";
  }
}

function layoutGraph(nodes: ShardNode[], edges: ShardEdge[]): ShardNode[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 80 });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const pos = graph.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

function walkUpstream(
  startId: string,
  shards: ShardInfoDto[],
  visited: Set<string>,
) {
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) break;
    const shard = shards.find((item) => item.id === current);
    if (!shard) continue;
    for (const dep of shard.dependencies) {
      if (!visited.has(dep)) {
        visited.add(dep);
        queue.push(dep);
      }
    }
  }
}

function walkDownstream(
  startId: string,
  shards: ShardInfoDto[],
  visited: Set<string>,
) {
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) break;
    for (const shard of shards) {
      if (shard.dependencies.includes(current) && !visited.has(shard.id)) {
        visited.add(shard.id);
        queue.push(shard.id);
      }
    }
  }
}

function getConnectedIds(shardId: string, shards: ShardInfoDto[]): Set<string> {
  const connected = new Set<string>();
  connected.add(shardId);
  walkUpstream(shardId, shards, connected);
  walkDownstream(shardId, shards, connected);
  return connected;
}

function buildGraph(shards: ShardInfoDto[]): ShardsGraph {
  const nodes: ShardNode[] = shards.map((shard) => ({
    id: shard.id,
    type: "default",
    data: { label: shard.label },
    position: { x: 0, y: 0 },
    style: {
      background: getStatusColor(shard.status),
      color: "white",
      border: "none",
      "border-radius": "8px",
      padding: "6px 12px",
      "font-size": "0.75rem",
      "font-weight": 500,
      width: `${NODE_WIDTH}px`,
      "word-break": "break-word",
      "white-space": "normal",
      "text-align": "center",
      "line-height": 1.3,
    },
  }));

  const edges: ShardEdge[] = shards.flatMap((shard) =>
    shard.dependencies.map((depId) => ({
      id: `${shard.id}-${depId}`,
      type: "default",
      source: shard.id,
      target: depId,
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
      },
    })),
  );

  return { nodes: layoutGraph(nodes, edges), edges };
}

function FitViewButton(): JSX.Element {
  const { fitView } = useSolidFlow();

  return (
    <button
      type="button"
      class={s.fitButton}
      onClick={() => void fitView({ padding: 0.2 })}
      aria-label="Fit view"
    >
      <Maximize2 size={14} aria-hidden="true" />
    </button>
  );
}

function ShardsDagInner(props: {
  graph: ShardsGraph;
  shards: ShardInfoDto[];
}): JSX.Element {
  const [selectedId, setSelectedId] = createSignal<string | null>(null);
  const highlightedIds = createMemo(() => {
    const id = selectedId();
    if (!id) return null;
    return getConnectedIds(id, props.shards);
  });

  const [nodes, setNodes] = createNodeStore(props.graph.nodes);
  const [edges, setEdges] = createEdgeStore(props.graph.edges);

  createEffect(() => {
    const highlighted = highlightedIds();
    setNodes(
      reconcile(
        props.graph.nodes.map((node) => ({
          ...node,
          style: {
            ...node.style,
            opacity: highlighted && !highlighted.has(node.id) ? 0.2 : 1,
          },
        })),
      ),
    );
    setEdges(
      reconcile(
        props.graph.edges.map((edge) => ({
          ...edge,
          animated:
            highlighted?.has(edge.source) && highlighted.has(edge.target),
          style: {
            opacity:
              highlighted &&
              !(highlighted.has(edge.source) && highlighted.has(edge.target))
                ? 0.1
                : 1,
          },
        })),
      ),
    );
  });

  return (
    <div class={s.container}>
      <FitViewButton />
      <SolidFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={({ node }) =>
          setSelectedId((prev) => (prev === node.id ? null : node.id))
        }
        onPaneClick={() => setSelectedId(null)}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
      </SolidFlow>
    </div>
  );
}

export function ShardsDag(props: ShardsDagProps): JSX.Element {
  const graph = createMemo(() => buildGraph(props.shards));

  return (
    <Show keyed when={graph()}>
      {(currentGraph) => (
        <SolidFlowProvider>
          <ShardsDagInner graph={currentGraph} shards={props.shards} />
        </SolidFlowProvider>
      )}
    </Show>
  );
}
