"use client";

import { useEffect, useRef } from "react";
import { Network, DataSet } from "vis-network/standalone";
import {
  Edge,
  GraphNode,
  NodeType,
  nodeTypeColors,
  relationTypeNames,
} from "@/lib/types";

interface IncidentGraphProps {
  nodes: GraphNode[];
  edges: Edge[];
  onSelectNode: (id: string) => void;
  physicsEnabled: boolean;
  onNetworkReady: (network: Network) => void;
  focusedNodeId?: string | null;
}

// 노드 타입별 모양
const nodeTypeShapes: Record<NodeType, string> = {
  incident: "dot",
  location: "diamond",
  phenomenon: "triangle",
  organization: "square",
  person: "star",
  equipment: "hexagon",
};

export function IncidentGraph({
  nodes: graphNodes,
  edges,
  onSelectNode,
  physicsEnabled,
  onNetworkReady,
  focusedNodeId,
}: IncidentGraphProps) {
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

  // Initialize network
  useEffect(() => {
    if (!containerRef.current) return;

    const nodeIds = new Set(graphNodes.map((n) => n.id));

    // Create nodes
    const nodes = new DataSet(
      graphNodes.map((node) => {
        const connectionCount = edges.filter(
          (e) =>
            (e.source === node.id || e.target === node.id) &&
            nodeIds.has(e.source) &&
            nodeIds.has(e.target)
        ).length;

        const isFocused = node.id === focusedNodeId;
        const baseColor = nodeTypeColors[node.type];

        return {
          id: node.id,
          label: node.label.length > 25
            ? node.label.substring(0, 25) + "..."
            : node.label,
          title: `${node.label}${node.description ? "\n\n" + node.description : ""}\n\n클릭하여 연관 노드 탐색`,
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
          size: isFocused ? 30 : 20 + Math.min(connectionCount * 3, 15),
          font: {
            color: isFocused ? baseColor : "#ffffff",
            size: isFocused ? 14 : 11,
            face: "system-ui, -apple-system, sans-serif",
          },
          borderWidth: isFocused ? 4 : 2,
        };
      })
    );

    // Create edges
    const edgeData = edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((edge) => ({
        id: edge.id,
        from: edge.source,
        to: edge.target,
        label: relationTypeNames[edge.relationType] || edge.relationType,
        title: edge.description || relationTypeNames[edge.relationType] || edge.relationType,
        color: {
          color: "#4a4a5a",
          highlight: "#8b6bc2",
          hover: "#8b6bc2",
        },
        font: {
          color: "#808090",
          size: 10,
          strokeWidth: 0,
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
          size: 10,
          x: 0,
          y: 3,
        },
      },
      edges: {
        width: 1.5,
        smooth: {
          enabled: true,
          type: "continuous",
          roundness: 0.5,
        },
      },
      physics: {
        enabled: physicsEnabled,
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.005,
          springLength: 200,
          springConstant: 0.08,
          damping: 0.4,
          avoidOverlap: 0.5,
        },
        solver: "forceAtlas2Based",
        stabilization: {
          enabled: true,
          iterations: 100,
          updateInterval: 25,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        hideEdgesOnDrag: true,
        multiselect: false,
      },
    };

    const network = new Network(
      containerRef.current,
      { nodes, edges: visEdges },
      options
    );

    networkRef.current = network;
    onNetworkReadyRef.current(network);

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
  }, [
    graphNodes,
    edges,
    physicsEnabled,
    focusedNodeId,
  ]);

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
      className="w-full h-full graph-container"
    />
  );
}
