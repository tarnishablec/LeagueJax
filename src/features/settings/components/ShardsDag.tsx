import dagre from "@dagrejs/dagre";
import {
  Background,
  type Edge,
  MarkerType,
  type Node,
  type NodeMouseHandler,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ShardInfoDto } from "@/bindings/shards";
import * as s from "./ShardsDag.css";

interface ShardsDagProps {
  shards: ShardInfoDto[];
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

function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 80 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
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
    const shard = shards.find((s) => s.id === current);
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

function FitViewButton() {
  const { fitView } = useReactFlow();
  return (
    <button
      type="button"
      className={s.fitButton}
      onClick={() => fitView({ padding: 0.2 })}
      aria-label="Fit view"
    >
      <Maximize2 size={14} aria-hidden="true" />
    </button>
  );
}

function ShardsDagInner({ shards }: ShardsDagProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const highlightedIds = useMemo(() => {
    if (!selectedId) return null;
    return getConnectedIds(selectedId, shards);
  }, [selectedId, shards]);

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = shards.map((shard) => ({
      id: shard.id,
      data: { label: shard.label },
      position: { x: 0, y: 0 },
      style: {
        background: getStatusColor(shard.status),
        color: "white",
        border: "none",
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: "0.75rem",
        fontWeight: 500,
        width: NODE_WIDTH,
        wordBreak: "break-word",
        whiteSpace: "normal",
        textAlign: "center",
        lineHeight: 1.3,
      },
    }));

    const edges: Edge[] = shards.flatMap((shard) =>
      shard.dependencies.map((depId) => ({
        id: `${shard.id}-${depId}`,
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

    const laidOut = layoutGraph(nodes, edges);
    return { initialNodes: laidOut, initialEdges: edges };
  }, [shards]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(
      initialNodes.map((node) => ({
        ...node,
        style: {
          ...node.style,
          opacity: highlightedIds && !highlightedIds.has(node.id) ? 0.2 : 1,
        },
      })),
    );
    setEdges(
      initialEdges.map((edge) => ({
        ...edge,
        animated:
          highlightedIds?.has(edge.source) && highlightedIds.has(edge.target),
        style: {
          opacity:
            highlightedIds &&
            !(
              highlightedIds.has(edge.source) && highlightedIds.has(edge.target)
            )
              ? 0.1
              : 1,
        },
      })),
    );
  }, [highlightedIds, initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedId(null);
  }, []);

  return (
    <div className={s.container}>
      <FitViewButton />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}

export function ShardsDag({ shards }: ShardsDagProps) {
  return (
    <ReactFlowProvider>
      <ShardsDagInner shards={shards} />
    </ReactFlowProvider>
  );
}
