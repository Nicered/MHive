"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Network } from "vis-network/standalone";
import { Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { FilterSidebar } from "@/components/filter-sidebar";
import { IncidentDetail } from "@/components/incident-detail";
import { Legend } from "@/components/legend";
import { incidentsData } from "@/lib/data";
import { Category, Era, Incident } from "@/lib/types";

// Dynamic import for Vis.js graph (client-side only)
const IncidentGraph = dynamic(
  () => import("@/components/incident-graph").then((mod) => mod.IncidentGraph),
  { ssr: false }
);

export default function Home() {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([
    "mystery",
    "crime",
    "accident",
    "unsolved",
    "conspiracy",
  ]);
  const [selectedEras, setSelectedEras] = useState<Era[]>([
    "ancient",
    "modern",
    "contemporary",
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null
  );
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [network, setNetwork] = useState<Network | null>(null);

  // Calculate stats
  const filteredIncidents = incidentsData.incidents.filter((incident) => {
    if (!selectedCategories.includes(incident.category)) return false;
    if (!selectedEras.includes(incident.era)) return false;
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

  const filteredIds = new Set(filteredIncidents.map((i) => i.id));
  const filteredConnections = incidentsData.relations.filter(
    (r) => filteredIds.has(r.from) && filteredIds.has(r.to)
  ).length;

  // Handlers
  const handleCategoryChange = useCallback(
    (category: Category, checked: boolean) => {
      setSelectedCategories((prev) =>
        checked ? [...prev, category] : prev.filter((c) => c !== category)
      );
    },
    []
  );

  const handleEraChange = useCallback((era: Era, checked: boolean) => {
    setSelectedEras((prev) =>
      checked ? [...prev, era] : prev.filter((e) => e !== era)
    );
  }, []);

  const handleSelectIncident = useCallback(
    (id: number) => {
      const incident = incidentsData.incidents.find((i) => i.id === id);
      if (incident) {
        setSelectedIncident(incident);
        setDetailOpen(true);
      }
    },
    []
  );

  const handleResetZoom = useCallback(() => {
    if (network) {
      network.fit({
        animation: {
          duration: 500,
          easingFunction: "easeInOutQuad",
        },
      });
    }
  }, [network]);

  const handleTogglePhysics = useCallback(() => {
    setPhysicsEnabled((prev) => !prev);
  }, []);

  // Get related incidents
  const getRelatedIncidents = useCallback(
    (incident: Incident) => {
      const related: { incident: Incident; relation: string }[] = [];

      incidentsData.relations.forEach((r) => {
        if (r.from === incident.id) {
          const relatedIncident = incidentsData.incidents.find(
            (i) => i.id === r.to
          );
          if (relatedIncident) {
            related.push({ incident: relatedIncident, relation: r.relation });
          }
        } else if (r.to === incident.id) {
          const relatedIncident = incidentsData.incidents.find(
            (i) => i.id === r.from
          );
          if (relatedIncident) {
            related.push({ incident: relatedIncident, relation: r.relation });
          }
        }
      });

      return related;
    },
    []
  );

  // Handle URL hash for deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#incident-")) {
        const id = parseInt(hash.replace("#incident-", ""));
        if (!isNaN(id)) {
          handleSelectIncident(id);
        }
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [handleSelectIncident]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDetailOpen(false);
        setSidebarOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        // Focus search input
        const input = document.querySelector(
          'input[type="search"]'
        ) as HTMLInputElement;
        input?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="h-screen overflow-hidden">
      {/* Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalIncidents={filteredIncidents.length}
        totalConnections={filteredConnections}
        onMenuClick={() => setSidebarOpen(true)}
      />

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategories={selectedCategories}
        onCategoryChange={handleCategoryChange}
        selectedEras={selectedEras}
        onEraChange={handleEraChange}
        totalIncidents={filteredIncidents.length}
        totalConnections={filteredConnections}
        onResetZoom={handleResetZoom}
        onTogglePhysics={handleTogglePhysics}
        physicsEnabled={physicsEnabled}
      />

      {/* Main Content */}
      <main className="fixed top-14 left-0 lg:left-64 right-0 bottom-0">
        {/* Graph */}
        <IncidentGraph
          incidents={incidentsData.incidents}
          relations={incidentsData.relations}
          selectedCategories={selectedCategories}
          selectedEras={selectedEras}
          searchQuery={searchQuery}
          onSelectIncident={handleSelectIncident}
          physicsEnabled={physicsEnabled}
          onNetworkReady={setNetwork}
        />

        {/* Legend */}
        <Legend />

        {/* Mobile Filter Button */}
        <Button
          variant="secondary"
          size="icon"
          className="fixed top-[72px] left-4 lg:hidden z-30 rounded-full shadow-lg"
          onClick={() => setSidebarOpen(true)}
        >
          <Sliders className="h-5 w-5" />
        </Button>
      </main>

      {/* Incident Detail */}
      <IncidentDetail
        incident={selectedIncident}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        relatedIncidents={
          selectedIncident ? getRelatedIncidents(selectedIncident) : []
        }
        onSelectIncident={handleSelectIncident}
      />
    </div>
  );
}
