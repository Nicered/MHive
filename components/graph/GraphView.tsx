"use client";

import { useEffect, useRef, useCallback } from "react";
import { Network, DataSet } from "vis-network/standalone";
import {
  Edge,
  GraphNode,
  NodeType,
  nodeTypeColors,
  relationTypeNames,
  CategoryTree,
} from "@/lib/types";

interface GraphViewProps {
  nodes: GraphNode[];
  edges: Edge[];
  onSelectNode: (id: string) => void;
  physicsEnabled: boolean;
  onNetworkReady?: (network: Network) => void;
  focusedNodeId?: string | null;
  categories?: CategoryTree | null;
}

// Node shape by type
const nodeTypeShapes: Record<NodeType, string> = {
  category: "box",
  incident: "dot",
  location: "diamond",
  phenomenon: "triangle",
  organization: "square",
  person: "star",
  equipment: "hexagon",
};

export function GraphView({
  nodes: graphNodes,
  edges,
  onSelectNode,
  physicsEnabled,
  onNetworkReady,
  focusedNodeId,
  categories,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesRef = useRef<DataSet<any> | null>(null);
  const edgesRef = useRef<DataSet<any> | null>(null);
  const onSelectNodeRef = useRef(onSelectNode);
  const onNetworkReadyRef = useRef(onNetworkReady);

  // Update refs when callbacks change
  useEffect(() => {
    onSelectNodeRef.current = onSelectNode;
  }, [onSelectNode]);

  useEffect(() => {
    onNetworkReadyRef.current = onNetworkReady;
  }, [onNetworkReady]);

  // Get node color from category or type
  const getNodeColor = useCallback(
    (node: GraphNode): string => {
      if (node.type === "incident" && node.categoryId && categories) {
        const category = categories.nodes[node.categoryId];
        if (category?.color) return category.color;
      }
      return nodeTypeColors[node.type];
    },
    [categories]
  );

  // Initialize network
  useEffect(() => {
    if (!containerRef.current) return;

    const nodeIds = new Set(graphNodes.map((n) => n.id));

    // Create nodes dataset
    const nodes = new DataSet(
      graphNodes.map((node) => {
        const connectionCount = edges.filter(
          (e) =>
            (e.source === node.id || e.target === node.id) &&
            nodeIds.has(e.source) &&
            nodeIds.has(e.target)
        ).length;

        const isFocused = node.id === focusedNodeId;
        const baseColor = getNodeColor(node);

        return {
          id: node.id,
          label:
            node.label.length > 20
              ? node.label.substring(0, 20) + "..."
              : node.label,
          title: `${node.label}${node.description ? "\n\n" + node.description : ""}\n\n클릭하여 상세 보기`,
          shape: nodeTypeShapes[node.type],
          color: {
            background: isFocused ? "#ffffff" : baseColor,
            border: isFocused ? baseColor : baseColor,
            highlight: {
              background: baseColor,
              border: "#ffffff",
            },
            hover: {
              background: baseColor,
              border: "#ffffff",
            },
          },
          size: isFocused ? 25 : 15 + Math.min(connectionCount * 2, 10),
          font: {
            color: isFocused ? baseColor : "#ffffff",
            size: isFocused ? 14 : 11,
            face: "system-ui, -apple-system, sans-serif",
          },
          borderWidth: isFocused ? 4 : 2,
        };
      })
    );

    // Create edges dataset
    const edgeData = edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((edge) => ({
        id: edge.id,
        from: edge.source,
        to: edge.target,
        label:
          relationTypeNames[edge.relationType] || edge.relationType,
        title:
          edge.description ||
          relationTypeNames[edge.relationType] ||
          edge.relationType,
        color: {
          color: "#3a3a4a",
          highlight: "#6366f1",
          hover: "#6366f1",
        },
        font: {
          color: "#606070",
          size: 9,
          strokeWidth: 0,
        },
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.5,
          },
        },
      }));
    const visEdges = new DataSet(edgeData);

    nodesRef.current = nodes;
    edgesRef.current = visEdges;

    const options = {
      nodes: {
        shape: "dot",
        borderWidth: 2,
        shadow: {
          enabled: true,
          color: "rgba(0,0,0,0.3)",
          size: 8,
          x: 0,
          y: 2,
        },
      },
      edges: {
        width: 1,
        smooth: {
          enabled: true,
          type: "continuous",
          roundness: 0.5,
        },
      },
      physics: {
        enabled: physicsEnabled,
        forceAtlas2Based: {
          gravitationalConstant: -40,
          centralGravity: 0.005,
          springLength: 150,
          springConstant: 0.08,
          damping: 0.4,
          avoidOverlap: 0.5,
        },
        solver: "forceAtlas2Based",
        stabilization: {
          enabled: true,
          iterations: 80,
          updateInterval: 25,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        hideEdgesOnDrag: true,
        multiselect: false,
        zoomView: true,
        dragView: true,
      },
    };

    const network = new Network(
      containerRef.current,
      { nodes, edges: visEdges },
      options
    );

    networkRef.current = network;
    onNetworkReadyRef.current?.(network);

    // Event handlers
    network.on("click", (params) => {
      if (params.nodes.length > 0) {
        onSelectNodeRef.current(params.nodes[0] as string);
      }
    });

    network.on("doubleClick", (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as string;
        network.focus(nodeId, {
          scale: 1.5,
          animation: {
            duration: 500,
            easingFunction: "easeInOutQuad",
          },
        });
        onSelectNodeRef.current(nodeId);
      }
    });

    return () => {
      network.destroy();
    };
  }, [graphNodes, edges, physicsEnabled, focusedNodeId, getNodeColor]);

  // Update physics when prop changes
  useEffect(() => {
    if (networkRef.current) {
      networkRef.current.setOptions({
        physics: {
          enabled: physicsEnabled,
        },
      });
    }
  }, [physicsEnabled]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-zinc-950"
      style={{ minHeight: "400px" }}
    />
  );
}

export default GraphView;
