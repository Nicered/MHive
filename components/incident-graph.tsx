"use client";

import { useEffect, useRef } from "react";
import { Network, DataSet } from "vis-network/standalone";
import {
  IncidentMeta,
  Relation,
  TopCategory,
  Era,
  getCategoryColor,
} from "@/lib/types";

interface IncidentGraphProps {
  incidents: IncidentMeta[];
  relations: Relation[];
  selectedCategories: TopCategory[];
  selectedEras: Era[];
  searchQuery: string;
  onSelectIncident: (id: string) => void;
  physicsEnabled: boolean;
  onNetworkReady: (network: Network) => void;
  focusedNodeId?: string | null;
}

export function IncidentGraph({
  incidents,
  relations,
  selectedCategories,
  selectedEras,
  searchQuery,
  onSelectIncident,
  physicsEnabled,
  onNetworkReady,
  focusedNodeId,
}: IncidentGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesRef = useRef<DataSet<any> | null>(null);
  const edgesRef = useRef<DataSet<any> | null>(null);
  const onSelectIncidentRef = useRef(onSelectIncident);
  const onNetworkReadyRef = useRef(onNetworkReady);

  // Update refs when callbacks change
  useEffect(() => {
    onSelectIncidentRef.current = onSelectIncident;
  }, [onSelectIncident]);

  useEffect(() => {
    onNetworkReadyRef.current = onNetworkReady;
  }, [onNetworkReady]);

  // Initialize network
  useEffect(() => {
    if (!containerRef.current) return;

    const filteredIncidents = incidents;
    const filteredIds = new Set(filteredIncidents.map((i) => i.id));

    // Create nodes
    const nodes = new DataSet(
      filteredIncidents.map((incident) => {
        const connectionCount = relations.filter(
          (r) =>
            (r.from === incident.id || r.to === incident.id) &&
            filteredIds.has(r.from) &&
            filteredIds.has(r.to)
        ).length;

        const isFocused = incident.id === focusedNodeId;
        const baseColor = getCategoryColor(incident.category);

        return {
          id: incident.id,
          label: incident.title.length > 25
            ? incident.title.substring(0, 25) + "..."
            : incident.title,
          title: `${incident.title}\n\n${incident.summary}\n\n클릭하여 연관 사건 탐색`,
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
    const edgeData = relations
      .filter((r) => filteredIds.has(r.from) && filteredIds.has(r.to))
      .map((relation, index) => ({
        id: index,
        from: relation.from,
        to: relation.to,
        label: relation.type,
        title: relation.description || relation.type,
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
    const edges = new DataSet(edgeData);

    nodesRef.current = nodes;
    edgesRef.current = edges;

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
      { nodes, edges },
      options
    );

    networkRef.current = network;
    onNetworkReadyRef.current(network);

    // Event handlers
    network.on("click", (params) => {
      if (params.nodes.length > 0) {
        onSelectIncidentRef.current(params.nodes[0] as string);
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
        onSelectIncidentRef.current(nodeId);
      }
    });

    return () => {
      network.destroy();
    };
  }, [
    incidents,
    relations,
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
