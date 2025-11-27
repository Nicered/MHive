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
  fetchIndexData,
  fetchRelationsData,
  fetchIncidentDetail,
  fetchEntityDetail,
  saveSessionState,
  loadSessionState,
  clearSessionState,
} from "@/lib/data";
import {
  TopCategory,
  Era,
  Incident,
  Edge,
  IndexData,
  RelationsData,
  IndexIncident,
  RelationType,
  GraphNode,
  NodeType,
  getCategoryLabel,
  nodeTypeColors,
  nodeTypeNames,
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
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [network, setNetwork] = useState<Network | null>(null);

  // Neo4j 스타일 탐색용 상태
  const [displayedNodeIds, setDisplayedNodeIds] = useState<Set<string>>(new Set());
  const [clickedNodeIds, setClickedNodeIds] = useState<Set<string>>(new Set()); // 사용자가 클릭한 노드 (절대 사라지지 않음)
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

        // 인덱스와 관계 데이터 병렬 로드
        const [index, relations] = await Promise.all([
          fetchIndexData(),
          fetchRelationsData(),
        ]);

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

  // 모든 Edge 사용 (더 이상 incident 간 관계만 필터링하지 않음)
  const allEdges = useMemo(() => {
    return relationsData?.edges || [];
  }, [relationsData]);

  // 모든 엔티티 ID -> GraphNode 맵 (인덱스 데이터 기반)
  const entityMap = useMemo(() => {
    if (!indexData) return new Map<string, GraphNode>();

    const map = new Map<string, GraphNode>();

    // IndexIncident -> GraphNode
    indexData.incidents?.forEach((e) => map.set(e.id, {
      id: e.id,
      type: "incident" as NodeType,
      label: e.title,
    }));
    // IndexLocation -> GraphNode
    indexData.locations?.forEach((e) => map.set(e.id, {
      id: e.id,
      type: "location" as NodeType,
      label: e.name,
    }));
    // IndexPhenomenon -> GraphNode
    indexData.phenomena?.forEach((e) => map.set(e.id, {
      id: e.id,
      type: "phenomenon" as NodeType,
      label: e.name,
    }));
    // IndexOrganization -> GraphNode
    indexData.organizations?.forEach((e) => map.set(e.id, {
      id: e.id,
      type: "organization" as NodeType,
      label: e.nameShort || e.name,
    }));
    // IndexPerson -> GraphNode
    indexData.persons?.forEach((e) => map.set(e.id, {
      id: e.id,
      type: "person" as NodeType,
      label: e.name,
    }));
    // IndexEquipment -> GraphNode
    indexData.equipment?.forEach((e) => map.set(e.id, {
      id: e.id,
      type: "equipment" as NodeType,
      label: e.name,
    }));

    return map;
  }, [indexData]);

  // 전체 필터링된 인시던트 (카테고리/시대 기반) - IndexIncident 사용
  const allFilteredIncidents = useMemo(() => {
    if (!indexData?.incidents) return [];
    return indexData.incidents.filter((incident: IndexIncident) => {
      if (!selectedCategories.includes(incident.category)) return false;
      if (!selectedEras.includes(incident.era)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return incident.title.toLowerCase().includes(query);
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
        // entityMap에 있는 ID만 유효
        const validIds = savedState.displayedNodeIds.filter((id: string) =>
          entityMap.has(id)
        );
        if (validIds.length > 0) {
          setDisplayedNodeIds(new Set(validIds));
        }
      }

      if (savedState.clickedNodeIds?.length > 0) {
        const validClickedIds = savedState.clickedNodeIds.filter((id: string) =>
          entityMap.has(id)
        );
        if (validClickedIds.length > 0) {
          setClickedNodeIds(new Set(validClickedIds));
        }
      }

      if (savedState.focusedNodeId !== null) {
        setFocusedNodeId(savedState.focusedNodeId);
      }

      // selectedIncidentId 복원 시 lazy load
      if (savedState.selectedIncidentId !== null) {
        fetchIncidentDetail(savedState.selectedIncidentId).then((incident) => {
          if (incident) {
            setSelectedIncident(incident);
          }
        });
      }
    }

    sessionRestored.current = true;
  }, [indexData, entityMap]);

  // 초기 노드 설정
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!sessionRestored.current || !indexData) return;
    if (initializedRef.current) return;

    if (displayedNodeIds.size === 0 && allFilteredIncidents.length > 0) {
      const initialIds = new Set(
        allFilteredIncidents.slice(0, INITIAL_NODE_COUNT).map((i: IndexIncident) => i.id)
      );
      setDisplayedNodeIds(initialIds);
      setFocusedNodeId(null);
      setSelectedIncident(null);
      initializedRef.current = true;
    }
  }, [allFilteredIncidents, indexData]);

  // Save session state when relevant state changes
  useEffect(() => {
    if (!indexData || !sessionRestored.current) return;

    saveSessionState({
      displayedNodeIds: Array.from(displayedNodeIds),
      clickedNodeIds: Array.from(clickedNodeIds),
      focusedNodeId,
      selectedIncidentId: selectedIncident?.id ?? null,
      selectedCategories,
      selectedEras,
    });
  }, [
    displayedNodeIds,
    clickedNodeIds,
    focusedNodeId,
    selectedIncident,
    selectedCategories,
    selectedEras,
    indexData,
  ]);

  // 표시할 그래프 노드들 (모든 엔티티 타입 포함)
  const displayedGraphNodes = useMemo((): GraphNode[] => {
    if (!indexData) return [];
    if (displayedNodeIds.size === 0 && clickedNodeIds.size === 0) return [];

    const allDisplayedIds = new Set([...displayedNodeIds, ...clickedNodeIds]);
    const nodes: GraphNode[] = [];

    allDisplayedIds.forEach((id) => {
      const graphNode = entityMap.get(id);
      if (graphNode) {
        nodes.push(graphNode);
      }
    });

    return nodes;
  }, [indexData, displayedNodeIds, clickedNodeIds, entityMap]);

  // 표시할 인시던트만 (상세보기용) - IndexIncident 사용
  const displayedIncidents = useMemo(() => {
    if (!indexData?.incidents) return [];
    if (displayedNodeIds.size === 0 && clickedNodeIds.size === 0) return [];

    const allDisplayedIds = new Set([...displayedNodeIds, ...clickedNodeIds]);
    return indexData.incidents.filter((i: IndexIncident) => allDisplayedIds.has(i.id));
  }, [indexData, displayedNodeIds, clickedNodeIds]);

  // 표시할 관계들 (모든 엔티티 간)
  const displayedEdges = useMemo(() => {
    const allDisplayedIds = new Set([...displayedNodeIds, ...clickedNodeIds]);
    if (allDisplayedIds.size === 0) return [];
    return allEdges.filter(
      (e: Edge) => allDisplayedIds.has(e.source) && allDisplayedIds.has(e.target)
    );
  }, [displayedNodeIds, clickedNodeIds, allEdges]);

  // 노드 확장 (선택한 노드의 연관 노드 추가 - 모든 엔티티 타입)
  const expandNode = useCallback(
    (nodeId: string) => {
      // 클릭된 노드로 기록 (절대 사라지지 않음)
      setClickedNodeIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(nodeId);
        return newSet;
      });

      const relatedNodeIds = new Set<string>();

      // 모든 Edge를 검사하여 연관된 모든 노드 찾기
      allEdges.forEach((e: Edge) => {
        if (e.source === nodeId) relatedNodeIds.add(e.target);
        if (e.target === nodeId) relatedNodeIds.add(e.source);
      });

      // 연관 노드는 모두 추가 (모든 엔티티 타입)
      const validRelatedIds = Array.from(relatedNodeIds)
        .filter((id) => entityMap.has(id))
        .slice(0, EXPAND_NODE_COUNT);

      setDisplayedNodeIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(nodeId);
        validRelatedIds.forEach((id) => newSet.add(id));
        return newSet;
      });

      setFocusedNodeId(nodeId);
    },
    [allEdges, entityMap]
  );

  // 노드 클릭 핸들러 (모든 엔티티 타입)
  const handleNodeClick = useCallback(
    async (id: string) => {
      if (!indexData) return;

      // GraphNode 찾기 (인덱스 데이터에서)
      const graphNode = entityMap.get(id);
      if (!graphNode) return;

      // Incident인 경우 lazy load 후 상세보기 설정
      if (graphNode.type === "incident") {
        const incidentDetail = await fetchIncidentDetail(id);
        if (incidentDetail) {
          setSelectedIncident(incidentDetail);
        }
      } else {
        // 다른 타입의 노드 클릭 시 선택된 incident 초기화
        setSelectedIncident(null);
      }

      // 확장은 모든 노드에 대해 수행
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
    },
    [expandNode, network, indexData, entityMap]
  );

  // 상세보기 열기
  const handleOpenDetail = useCallback(() => {
    if (!selectedIncident) return;
    setDetailOpen(true);
  }, [selectedIncident]);

  // 그래프 리셋
  const handleResetGraph = useCallback(() => {
    const initialIds = new Set(
      allFilteredIncidents.slice(0, INITIAL_NODE_COUNT).map((i: IndexIncident) => i.id)
    );
    setDisplayedNodeIds(initialIds);
    setClickedNodeIds(new Set()); // 클릭 기록도 초기화
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

  // Get related incidents (incident 간의 관계) - IndexIncident 기반
  const getRelatedIncidents = useCallback(
    (incident: Incident) => {
      const related: { incident: IndexIncident; relation: RelationType }[] = [];

      if (!indexData?.incidents) {
        return related;
      }

      allEdges.forEach((e: Edge) => {
        if (e.source === incident.id) {
          const relatedIncident = indexData.incidents.find(
            (i: IndexIncident) => i.id === e.target
          );
          if (relatedIncident) {
            related.push({ incident: relatedIncident, relation: e.relationType });
          }
        } else if (e.target === incident.id) {
          const relatedIncident = indexData.incidents.find(
            (i: IndexIncident) => i.id === e.source
          );
          if (relatedIncident) {
            related.push({ incident: relatedIncident, relation: e.relationType });
          }
        }
      });

      return related;
    },
    [indexData, allEdges]
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
        totalIncidents={displayedGraphNodes.length}
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
        totalIncidents={displayedGraphNodes.length}
        totalConnections={displayedEdges.length}
        onResetZoom={handleResetZoom}
        onTogglePhysics={handleTogglePhysics}
        physicsEnabled={physicsEnabled}
      />

      {/* Main Content */}
      <main className="fixed top-14 left-0 lg:left-64 right-0 bottom-0">
        {/* Graph */}
        <IncidentGraph
          nodes={displayedGraphNodes}
          edges={displayedEdges}
          onSelectNode={handleNodeClick}
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
