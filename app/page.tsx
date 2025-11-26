"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Network } from "vis-network/standalone";
import { Sliders, Eye, RefreshCw } from "lucide-react";
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

// Neo4j 스타일 탐색을 위한 설정
const INITIAL_NODE_COUNT = 10;
const EXPAND_NODE_COUNT = 10;

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
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [network, setNetwork] = useState<Network | null>(null);

  // Neo4j 스타일 탐색용 상태
  const [displayedNodeIds, setDisplayedNodeIds] = useState<Set<number>>(new Set());
  const [focusedNodeId, setFocusedNodeId] = useState<number | null>(null);

  // 전체 필터링된 인시던트 (카테고리/시대 기반)
  const allFilteredIncidents = useMemo(() => {
    return incidentsData.incidents.filter((incident) => {
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
  }, [selectedCategories, selectedEras, searchQuery]);

  // 초기 노드 설정 (검색어 변경 시 또는 처음 로드 시)
  useEffect(() => {
    if (allFilteredIncidents.length > 0) {
      // 검색어가 있으면 검색 결과의 처음 10개
      // 없으면 랜덤 10개 또는 최신 10개
      const initialIds = new Set(
        allFilteredIncidents
          .slice(0, INITIAL_NODE_COUNT)
          .map((i) => i.id)
      );
      setDisplayedNodeIds(initialIds);
      setFocusedNodeId(null);
    }
  }, [searchQuery, selectedCategories, selectedEras]);

  // 표시할 노드들
  const displayedIncidents = useMemo(() => {
    return allFilteredIncidents.filter((i) => displayedNodeIds.has(i.id));
  }, [allFilteredIncidents, displayedNodeIds]);

  // 표시할 관계들
  const displayedRelations = useMemo(() => {
    return incidentsData.relations.filter(
      (r) => displayedNodeIds.has(r.from) && displayedNodeIds.has(r.to)
    );
  }, [displayedNodeIds]);

  // 노드 확장 (선택한 노드의 연관 노드 추가)
  const expandNode = useCallback((nodeId: number) => {
    const relatedNodeIds = new Set<number>();

    // 해당 노드와 연결된 모든 노드 찾기
    incidentsData.relations.forEach((r) => {
      if (r.from === nodeId) relatedNodeIds.add(r.to);
      if (r.to === nodeId) relatedNodeIds.add(r.from);
    });

    // 필터 조건에 맞는 노드만 선택
    const filteredIds = new Set(allFilteredIncidents.map((i) => i.id));
    const validRelatedIds = Array.from(relatedNodeIds)
      .filter((id) => filteredIds.has(id))
      .slice(0, EXPAND_NODE_COUNT);

    // 기존 노드에 새 노드 추가
    setDisplayedNodeIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(nodeId);
      validRelatedIds.forEach((id) => newSet.add(id));
      return newSet;
    });

    setFocusedNodeId(nodeId);
  }, [allFilteredIncidents]);

  // 노드 클릭 핸들러
  const handleNodeClick = useCallback((id: number) => {
    const incident = incidentsData.incidents.find((i) => i.id === id);
    if (incident) {
      setSelectedIncident(incident);
      expandNode(id);

      // 네트워크에서 해당 노드로 포커스
      if (network) {
        network.focus(id, {
          scale: 1.2,
          animation: {
            duration: 500,
            easingFunction: "easeInOutQuad",
          },
        });
      }
    }
  }, [expandNode, network]);

  // 상세보기 열기
  const handleOpenDetail = useCallback(() => {
    if (selectedIncident) {
      setDetailOpen(true);
    }
  }, [selectedIncident]);

  // 그래프 리셋
  const handleResetGraph = useCallback(() => {
    const initialIds = new Set(
      allFilteredIncidents
        .slice(0, INITIAL_NODE_COUNT)
        .map((i) => i.id)
    );
    setDisplayedNodeIds(initialIds);
    setFocusedNodeId(null);
    setSelectedIncident(null);

    if (network) {
      network.fit({
        animation: {
          duration: 500,
          easingFunction: "easeInOutQuad",
        },
      });
    }
  }, [allFilteredIncidents, network]);

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
          handleNodeClick(id);
        }
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [handleNodeClick]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDetailOpen(false);
        setSidebarOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
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
        totalIncidents={displayedIncidents.length}
        totalConnections={displayedRelations.length}
        onMenuClick={() => setSidebarOpen(true)}
        totalFilteredCount={allFilteredIncidents.length}
        hasMoreIncidents={displayedNodeIds.size < allFilteredIncidents.length}
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
        totalIncidents={displayedIncidents.length}
        totalConnections={displayedRelations.length}
        onResetZoom={handleResetZoom}
        onTogglePhysics={handleTogglePhysics}
        physicsEnabled={physicsEnabled}
      />

      {/* Main Content */}
      <main className="fixed top-14 left-0 lg:left-64 right-0 bottom-0">
        {/* Graph */}
        <IncidentGraph
          incidents={displayedIncidents}
          relations={displayedRelations}
          selectedCategories={selectedCategories}
          selectedEras={selectedEras}
          searchQuery={searchQuery}
          onSelectIncident={handleNodeClick}
          physicsEnabled={physicsEnabled}
          onNetworkReady={setNetwork}
          focusedNodeId={focusedNodeId}
        />

        {/* Legend */}
        <Legend />

        {/* Selected Node Info Panel */}
        {selectedIncident && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 lg:left-[calc(50%+8rem)] z-30 max-w-md">
            <div className="bg-zinc-900/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-xl border border-zinc-700">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">
                    {selectedIncident.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {selectedIncident.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {selectedIncident.category}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {selectedIncident.date}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={handleOpenDetail}
                    className="h-8 text-xs gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    상세보기
                  </Button>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  노드 클릭으로 연관 사건 탐색
                </span>
                <span className="text-xs text-zinc-400">
                  {displayedNodeIds.size}개 표시 중
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Reset Button */}
        <Button
          variant="secondary"
          size="sm"
          className="fixed bottom-4 right-4 z-30 gap-1"
          onClick={handleResetGraph}
        >
          <RefreshCw className="h-3 w-3" />
          초기화
        </Button>

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
        onSelectIncident={handleNodeClick}
      />
    </div>
  );
}
