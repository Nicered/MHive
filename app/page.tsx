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
  fetchInitialData,
  fetchFullIncident,
  saveSessionState,
  loadSessionState,
  clearSessionState,
} from "@/lib/data";
import {
  TopCategory,
  CategoryPath,
  Era,
  IncidentMeta,
  Incident,
  IndexData,
  RelationsData,
  Relation,
  getTopCategory,
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
  const [indexData, setIndexData] = useState<IndexData | null>(null);
  const [relationsData, setRelationsData] = useState<RelationsData | null>(null);
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
  const [selectedMeta, setSelectedMeta] = useState<IncidentMeta | null>(null);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [network, setNetwork] = useState<Network | null>(null);

  // Neo4j 스타일 탐색용 상태
  const [displayedNodeIds, setDisplayedNodeIds] = useState<Set<string>>(new Set());
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load data on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoadProgress(10);

        const progressInterval = setInterval(() => {
          setLoadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        const { index, relations } = await fetchInitialData();

        clearInterval(progressInterval);

        if (isMounted) {
          setLoadProgress(100);
          setIndexData(index);
          setRelationsData(relations);
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

  // 전체 필터링된 인시던트 (카테고리/시대 기반)
  const allFilteredIncidents = useMemo(() => {
    if (!indexData?.incidents) return [];
    return indexData.incidents.filter((incident: IncidentMeta) => {
      const topCategory = getTopCategory(incident.category);
      if (!selectedCategories.includes(topCategory)) return false;
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
  }, [indexData, selectedCategories, selectedEras, searchQuery]);

  // Restore session state after data is loaded
  useEffect(() => {
    if (!indexData || sessionRestored.current) return;

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
          indexData.incidents.some((i: IncidentMeta) => i.id === id)
        );
        if (validIds.length > 0) {
          setDisplayedNodeIds(new Set(validIds));
        }
      }

      if (savedState.focusedNodeId !== null) {
        setFocusedNodeId(savedState.focusedNodeId);
      }

      if (savedState.selectedIncidentId !== null) {
        const meta = indexData.incidents.find(
          (i: IncidentMeta) => i.id === savedState.selectedIncidentId
        );
        if (meta) {
          setSelectedMeta(meta);
        }
      }
    }

    sessionRestored.current = true;
  }, [indexData]);

  // 초기 노드 설정
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!sessionRestored.current || !indexData) return;
    if (initializedRef.current) return;

    if (displayedNodeIds.size === 0 && allFilteredIncidents.length > 0) {
      const initialIds = new Set(
        allFilteredIncidents.slice(0, INITIAL_NODE_COUNT).map((i: IncidentMeta) => i.id)
      );
      setDisplayedNodeIds(initialIds);
      setFocusedNodeId(null);
      setSelectedMeta(null);
      setSelectedIncident(null);
      initializedRef.current = true;
    }
  }, [allFilteredIncidents, indexData]);

  // Save session state when relevant state changes
  useEffect(() => {
    if (!indexData || !sessionRestored.current) return;

    saveSessionState({
      displayedNodeIds: Array.from(displayedNodeIds),
      focusedNodeId,
      selectedIncidentId: selectedMeta?.id ?? null,
      selectedCategories,
      selectedEras,
    });
  }, [
    displayedNodeIds,
    focusedNodeId,
    selectedMeta,
    selectedCategories,
    selectedEras,
    indexData,
  ]);

  // 표시할 노드들
  const displayedIncidents = useMemo(() => {
    if (displayedNodeIds.size === 0) return [];
    return allFilteredIncidents.filter((i: IncidentMeta) => displayedNodeIds.has(i.id));
  }, [allFilteredIncidents, displayedNodeIds]);

  // 표시할 관계들
  const displayedRelations = useMemo(() => {
    if (displayedNodeIds.size === 0) return [];
    if (!relationsData?.relations) return [];
    return relationsData.relations.filter(
      (r: Relation) => displayedNodeIds.has(r.from) && displayedNodeIds.has(r.to)
    );
  }, [displayedNodeIds, relationsData]);

  // 노드 확장 (선택한 노드의 연관 노드 추가)
  const expandNode = useCallback(
    (nodeId: string) => {
      if (!relationsData?.relations) return;

      const relatedNodeIds = new Set<string>();

      relationsData.relations.forEach((r: Relation) => {
        if (r.from === nodeId) relatedNodeIds.add(r.to);
        if (r.to === nodeId) relatedNodeIds.add(r.from);
      });

      const filteredIds = new Set(allFilteredIncidents.map((i: IncidentMeta) => i.id));
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
    [allFilteredIncidents, relationsData]
  );

  // 노드 클릭 핸들러
  const handleNodeClick = useCallback(
    (id: string) => {
      if (!indexData?.incidents) return;
      const meta = indexData.incidents.find((i: IncidentMeta) => i.id === id);
      if (meta) {
        setSelectedMeta(meta);
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
    [expandNode, network, indexData]
  );

  // 상세보기 열기 (lazy loading)
  const handleOpenDetail = useCallback(async () => {
    if (!selectedMeta) return;

    setLoadingDetail(true);
    try {
      const fullIncident = await fetchFullIncident(selectedMeta);
      setSelectedIncident(fullIncident);
      setDetailOpen(true);
    } catch (error) {
      console.error("Failed to load incident detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedMeta]);

  // 그래프 리셋
  const handleResetGraph = useCallback(() => {
    const initialIds = new Set(
      allFilteredIncidents.slice(0, INITIAL_NODE_COUNT).map((i: IncidentMeta) => i.id)
    );
    setDisplayedNodeIds(initialIds);
    setFocusedNodeId(null);
    setSelectedMeta(null);
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
      const related: { incident: IncidentMeta; relation: string }[] = [];

      if (!relationsData?.relations || !indexData?.incidents) {
        return related;
      }

      relationsData.relations.forEach((r: Relation) => {
        if (r.from === incident.id) {
          const relatedMeta = indexData.incidents.find(
            (i: IncidentMeta) => i.id === r.to
          );
          if (relatedMeta) {
            related.push({ incident: relatedMeta, relation: r.type });
          }
        } else if (r.to === incident.id) {
          const relatedMeta = indexData.incidents.find(
            (i: IncidentMeta) => i.id === r.from
          );
          if (relatedMeta) {
            related.push({ incident: relatedMeta, relation: r.type });
          }
        }
      });

      return related;
    },
    [indexData, relationsData]
  );

  // Handle URL hash for deep linking
  useEffect(() => {
    if (!indexData) return;

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
  }, [handleNodeClick, indexData]);

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
        {selectedMeta && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 lg:left-[calc(50%+8rem)] z-30 max-w-md">
            <div className="bg-zinc-900/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-xl border border-zinc-700">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">
                    {selectedMeta.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {selectedMeta.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {selectedMeta.category}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {selectedMeta.date}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={handleOpenDetail}
                    disabled={loadingDetail}
                    className="h-8 text-xs gap-1"
                  >
                    {loadingDetail ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
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
