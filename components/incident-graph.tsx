"use client";

import { useEffect, useRef, useCallback } from "react";
import { Network, DataSet } from "vis-network/standalone";
import { Incident, Relation, Category, Era, categoryColors } from "@/lib/types";

interface IncidentGraphProps {
  incidents: Incident[];
  relations: Relation[];
  selectedCategories: Category[];
  selectedEras: Era[];
  searchQuery: string;
  onSelectIncident: (id: number) => void;
  physicsEnabled: boolean;
  onNetworkReady: (network: Network) => void;
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
}: IncidentGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesRef = useRef<DataSet<any> | null>(null);
  const edgesRef = useRef<DataSet<any> | null>(null);

  // Filter incidents based on criteria
  const getFilteredIncidents = useCallback(() => {
    return incidents.filter((incident) => {
      // Category filter
      if (!selectedCategories.includes(incident.category)) return false;

      // Era filter
      if (!selectedEras.includes(incident.era)) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          incident.title.toLowerCase().includes(query) ||
          incident.summary.toLowerCase().includes(query) ||
          incident.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [incidents, selectedCategories, selectedEras, searchQuery]);

  // Initialize network
  useEffect(() => {
    if (!containerRef.current) return;

    const filteredIncidents = getFilteredIncidents();
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

        return {
          id: incident.id,
          label: incident.title,
          title: incident.summary,
          color: {
            background: categoryColors[incident.category],
            border: categoryColors[incident.category],
            highlight: {
              background: categoryColors[incident.category],
              border: "#ffffff",
            },
            hover: {
              background: categoryColors[incident.category],
              border: "#ffffff",
            },
          },
          size: 15 + connectionCount * 5,
          font: {
            color: "#ffffff",
            size: 12,
            face: "system-ui, -apple-system, sans-serif",
          },
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
        label: relation.relation,
        title: relation.relation,
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
    onNetworkReady(network);

    // Event handlers
    network.on("click", (params) => {
      if (params.nodes.length > 0) {
        onSelectIncident(params.nodes[0] as number);
      }
    });

    network.on("doubleClick", (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as number;
        network.focus(nodeId, {
          scale: 1.5,
          animation: {
            duration: 500,
            easingFunction: "easeInOutQuad",
          },
        });
        onSelectIncident(nodeId);
      }
    });

    return () => {
      network.destroy();
    };
  }, [
    incidents,
    relations,
    selectedCategories,
    selectedEras,
    searchQuery,
    physicsEnabled,
    getFilteredIncidents,
    onNetworkReady,
    onSelectIncident,
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
