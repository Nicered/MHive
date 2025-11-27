"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Network } from "vis-network/standalone";
import { Sliders, Eye, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { FilterSidebar } from "@/components/filter-sidebar";
import { IncidentDetail } from "@/components/incident-detail";
import { Legend } from "@/components/legend";
import {
  fetchMasterData,
  getIncidentEdges,
  saveSessionState,
  loadSessionState,
  clearSessionState,
} from "@/lib/data";
import {
  TopCategory,
  Era,
  Incident,
  Edge,
  MasterData,
  RelationType,
  getCategoryLabel,
} from "@/lib/types";

// Dynamic import for Vis.js graph (client-side only)
const IncidentGraph = dynamic(
  () => import("@/components/incident-graph").then((mod) => mod.IncidentGraph),
  { ssr: false }
);

// Neo4j 스타일 탐색을 위한 설정
const INITIAL_NODE_COUNT = 10;
const EXPAND_NODE_COUNT = 10;

// Default categories and eras
const DEFAULT_CATEGORIES: TopCategory[] = ["crime", "accident", "disaster", "mystery"];
const DEFAULT_ERAS: Era[] = ["ancient", "modern", "contemporary"];

export default function Home() {
  // Data loading state
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const sessionRestored = useRef(false);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] =
    useState<TopCategory[]>(DEFAULT_CATEGORIES);
  const [selectedEras, setSelectedEras] = useState<Era[]>(DEFAULT_ERAS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [network, setNetwork] = useState<Network | null>(null);

  // Neo4j 스타일 탐색용 상태
  const [displayedNodeIds, setDisplayedNodeIds] = useState<Set<string>>(new Set());
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoadProgress(10);

        const progressInterval = setInterval(() => {
          setLoadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        const data = await fetchMasterData();

        clearInterval(progressInterval);

        if (isMounted) {
          setLoadProgress(100);
          setMasterData(data);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(
            error instanceof Error ? error.message : "데이터를 불러오는데 실패했습니다"
          );
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Incident 간 관계만 필터링
  const incidentEdges = useMemo(() => {
    if (!masterData?.edges) return [];
    return getIncidentEdges(masterData.edges);
  }, [masterData]);

  // 전체 필터링된 인시던트 (카테고리/시대 기반)
  const allFilteredIncidents = useMemo(() => {
    if (!masterData?.nodes?.incidents) return [];
    return masterData.nodes.incidents.filter((incident: Incident) => {
      if (!selectedCategories.includes(incident.category)) return false;
      if (!selectedEras.includes(incident.era)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          incident.title.toLowerCase().includes(query) ||
          incident.summary.toLowerCase().includes(query) ||
          incident.tags.some((tag: string) => tag.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [masterData, selectedCategories, selectedEras, searchQuery]);

  // Restore session state after data is loaded
  useEffect(() => {
    if (!masterData || sessionRestored.current) return;

    const savedState = loadSessionState();
    if (savedState) {
      if (savedState.selectedCategories?.length > 0) {
        setSelectedCategories(savedState.selectedCategories as TopCategory[]);
      }
      if (savedState.selectedEras?.length > 0) {
        setSelectedEras(savedState.selectedEras as Era[]);
      }

      if (savedState.displayedNodeIds?.length > 0) {
        const validIds = savedState.displayedNodeIds.filter((id: string) =>
          masterData.nodes.incidents.some((i: Incident) => i.id === id)
        );
        if (validIds.length > 0) {
          setDisplayedNodeIds(new Set(validIds));
        }
      }

      if (savedState.focusedNodeId !== null) {
        setFocusedNodeId(savedState.focusedNodeId);
      }

      if (savedState.selectedIncidentId !== null) {
        const incident = masterData.nodes.incidents.find(
          (i: Incident) => i.id === savedState.selectedIncidentId
        );
        if (incident) {
          setSelectedIncident(incident);
        }
      }
    }

    sessionRestored.current = true;
  }, [masterData]);

  // 초기 노드 설정
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!sessionRestored.current || !masterData) return;
    if (initializedRef.current) return;

    if (displayedNodeIds.size === 0 && allFilteredIncidents.length > 0) {
      const initialIds = new Set(
        allFilteredIncidents.slice(0, INITIAL_NODE_COUNT).map((i: Incident) => i.id)
      );
      setDisplayedNodeIds(initialIds);
      setFocusedNodeId(null);
      setSelectedIncident(null);
      initializedRef.current = true;
    }
  }, [allFilteredIncidents, masterData]);

  // Save session state when relevant state changes
  useEffect(() => {
    if (!masterData || !sessionRestored.current) return;

    saveSessionState({
      displayedNodeIds: Array.from(displayedNodeIds),
      focusedNodeId,
      selectedIncidentId: selectedIncident?.id ?? null,
      selectedCategories,
      selectedEras,
    });
  }, [
    displayedNodeIds,
    focusedNodeId,
    selectedIncident,
    selectedCategories,
    selectedEras,
    masterData,
  ]);

  // 표시할 노드들
  const displayedIncidents = useMemo(() => {
    if (displayedNodeIds.size === 0) return [];
    return allFilteredIncidents.filter((i: Incident) => displayedNodeIds.has(i.id));
  }, [allFilteredIncidents, displayedNodeIds]);

  // 표시할 관계들
  const displayedEdges = useMemo(() => {
    if (displayedNodeIds.size === 0) return [];
    return incidentEdges.filter(
      (e: Edge) => displayedNodeIds.has(e.source) && displayedNodeIds.has(e.target)
    );
  }, [displayedNodeIds, incidentEdges]);

  // 노드 확장 (선택한 노드의 연관 노드 추가)
  const expandNode = useCallback(
    (nodeId: string) => {
      const relatedNodeIds = new Set<string>();

      incidentEdges.forEach((e: Edge) => {
        if (e.source === nodeId) relatedNodeIds.add(e.target);
        if (e.target === nodeId) relatedNodeIds.add(e.source);
      });

      const filteredIds = new Set(allFilteredIncidents.map((i: Incident) => i.id));
      const validRelatedIds = Array.from(relatedNodeIds)
        .filter((id) => filteredIds.has(id))
        .slice(0, EXPAND_NODE_COUNT);

      setDisplayedNodeIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(nodeId);
        validRelatedIds.forEach((id) => newSet.add(id));
        return newSet;
      });

      setFocusedNodeId(nodeId);
    },
    [allFilteredIncidents, incidentEdges]
  );

  // 노드 클릭 핸들러
  const handleNodeClick = useCallback(
    (id: string) => {
      if (!masterData?.nodes?.incidents) return;
      const incident = masterData.nodes.incidents.find((i: Incident) => i.id === id);
      if (incident) {
        setSelectedIncident(incident);
        expandNode(id);

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
    },
    [expandNode, network, masterData]
  );

  // 상세보기 열기
  const handleOpenDetail = useCallback(() => {
    if (!selectedIncident) return;
    setDetailOpen(true);
  }, [selectedIncident]);

  // 그래프 리셋
  const handleResetGraph = useCallback(() => {
    const initialIds = new Set(
      allFilteredIncidents.slice(0, INITIAL_NODE_COUNT).map((i: Incident) => i.id)
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

  // Clear session and reset
  const handleClearSession = useCallback(() => {
    clearSessionState();
    handleResetGraph();
  }, [handleResetGraph]);

  // Handlers
  const handleCategoryChange = useCallback(
    (category: TopCategory, checked: boolean) => {
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
      const related: { incident: Incident; relation: RelationType }[] = [];

      if (!masterData?.nodes?.incidents) {
        return related;
      }

      incidentEdges.forEach((e: Edge) => {
        if (e.source === incident.id) {
          const relatedIncident = masterData.nodes.incidents.find(
            (i: Incident) => i.id === e.target
          );
          if (relatedIncident) {
            related.push({ incident: relatedIncident, relation: e.relationType });
          }
        } else if (e.target === incident.id) {
          const relatedIncident = masterData.nodes.incidents.find(
            (i: Incident) => i.id === e.source
          );
          if (relatedIncident) {
            related.push({ incident: relatedIncident, relation: e.relationType });
          }
        }
      });

      return related;
    },
    [masterData, incidentEdges]
  );

  // Handle URL hash for deep linking
  useEffect(() => {
    if (!masterData) return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#incident-")) {
        const id = hash.replace("#incident-", "");
        handleNodeClick(id);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [handleNodeClick, masterData]);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-950">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
        <p className="text-zinc-400 text-lg mb-2">데이터를 불러오는 중...</p>
        <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${loadProgress}%` }}
          />
        </div>
        <p className="text-zinc-500 text-sm mt-2">{loadProgress}%</p>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-950">
        <p className="text-red-400 text-lg mb-4">오류: {loadError}</p>
        <Button onClick={() => window.location.reload()}>다시 시도</Button>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden">
      {/* Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalIncidents={displayedIncidents.length}
        totalConnections={displayedEdges.length}
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
        totalConnections={displayedEdges.length}
        onResetZoom={handleResetZoom}
        onTogglePhysics={handleTogglePhysics}
        physicsEnabled={physicsEnabled}
      />

      {/* Main Content */}
      <main className="fixed top-14 left-0 lg:left-64 right-0 bottom-0">
        {/* Graph */}
        <IncidentGraph
          incidents={displayedIncidents}
          edges={displayedEdges}
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
                      {getCategoryLabel(selectedIncident.category, selectedIncident.subCategory)}
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
