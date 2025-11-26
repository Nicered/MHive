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

// 그래프 성능을 위한 표시 제한
const DEFAULT_DISPLAY_LIMIT = 500;
const MAX_DISPLAY_LIMIT = 2000;

export default function Home() {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([
    "mystery",
    "crime",
    "accident",
    "unsolved",
    "conspiracy",
    "disaster",
    "terrorism",
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
  const [displayLimit, setDisplayLimit] = useState(DEFAULT_DISPLAY_LIMIT);

  // Calculate stats - 먼저 모든 필터링된 항목 계산
  const allFilteredIncidents = incidentsData.incidents.filter((incident) => {
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

  // 표시 제한 적용 (검색어가 있으면 제한 완화)
  const effectiveLimit = searchQuery ? Math.min(allFilteredIncidents.length, MAX_DISPLAY_LIMIT) : displayLimit;
  const filteredIncidents = allFilteredIncidents.slice(0, effectiveLimit);
  const hasMoreIncidents = allFilteredIncidents.length > effectiveLimit;
  const totalFilteredCount = allFilteredIncidents.length;

  const filteredIds = new Set(filteredIncidents.map((i) => i.id));
  const filteredConnections = incidentsData.relations.filter(
    (r) => filteredIds.has(r.from) && filteredIds.has(r.to)
  ).length;

  // 더 보기 핸들러
  const handleLoadMore = useCallback(() => {
    setDisplayLimit((prev) => Math.min(prev + 500, MAX_DISPLAY_LIMIT));
  }, []);

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
        totalFilteredCount={totalFilteredCount}
        hasMoreIncidents={hasMoreIncidents}
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
          incidents={filteredIncidents}
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

        {/* Load More Indicator */}
        {hasMoreIncidents && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 lg:left-[calc(50%+8rem)] z-30">
            <div className="bg-zinc-800/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-3 shadow-lg border border-zinc-700">
              <span className="text-sm text-zinc-300">
                {filteredIncidents.length.toLocaleString()} / {totalFilteredCount.toLocaleString()} 표시 중
              </span>
              {displayLimit < MAX_DISPLAY_LIMIT && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLoadMore}
                  className="h-7 text-xs"
                >
                  +500 더 보기
                </Button>
              )}
              {displayLimit >= MAX_DISPLAY_LIMIT && (
                <span className="text-xs text-zinc-500">
                  (성능을 위해 최대 {MAX_DISPLAY_LIMIT.toLocaleString()}개)
                </span>
              )}
            </div>
          </div>
        )}

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
