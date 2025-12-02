"use client";

import { useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Network } from "vis-network/standalone";
import { Loader2, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { DetailPanel } from "@/components/detail/DetailPanel";
import { useStore } from "@/store/useStore";
import {
  fetchCategories,
  fetchIndexData,
  fetchRelationsData,
  fetchEntityDetail,
} from "@/lib/data";
import { GraphNode, getNodeTypeFromId } from "@/lib/types";

// Dynamic import for Vis.js graph (client-side only)
const GraphView = dynamic(
  () => import("@/components/graph/GraphView").then((mod) => mod.GraphView),
  { ssr: false }
);

export default function Home() {
  const {
    // Data
    categories,
    indexData,
    relationsData,
    isLoading,
    loadError,
    setCategories,
    setIndexData,
    setRelationsData,
    setLoading,
    setLoadError,

    // View
    viewMode,
    setViewMode,
    sidebarOpen,
    setSidebarOpen,
    detailPanelOpen,
    setDetailPanelOpen,

    // Selection
    selectedCategoryId,
    selectedNodeId,
    selectedNode,
    selectCategory,
    selectNode,

    // Graph
    displayedNodeIds,
    setDisplayedNodeIds,
    addDisplayedNodeIds,
    focusedNodeId,
    setFocusedNodeId,
    physicsEnabled,
    togglePhysics,
    resetGraph,
    getGraphNodesFromIndex,
    getNeighborIds,

    // Breadcrumb
    breadcrumb,
    navigateToBreadcrumb,
    clearBreadcrumb,

    // Search
    searchQuery,
    setSearchQuery,
  } = useStore();

  // Network instance ref
  const networkRef = useCallback((network: Network | null) => {
    // Store network instance if needed
  }, []);

  // Load data on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);

        const [categoriesData, index, relations] = await Promise.all([
          fetchCategories(),
          fetchIndexData(),
          fetchRelationsData(),
        ]);

        if (isMounted) {
          setCategories(categoriesData);
          setIndexData(index);
          setRelationsData(relations);

          // Initialize with first 20 incidents if no nodes displayed
          if (displayedNodeIds.size === 0 && index.incidents.length > 0) {
            const initialIds = index.incidents.slice(0, 20).map((i) => i.id);
            setDisplayedNodeIds(new Set(initialIds));
          }

          setLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "데이터를 불러오는데 실패했습니다"
          );
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Build graph nodes from index
  const graphNodes = useMemo(() => {
    return getGraphNodesFromIndex();
  }, [getGraphNodesFromIndex, displayedNodeIds, indexData]);

  // Filter edges for displayed nodes
  const displayedEdges = useMemo(() => {
    if (!relationsData) return [];
    return relationsData.edges.filter(
      (e) => displayedNodeIds.has(e.source) && displayedNodeIds.has(e.target)
    );
  }, [relationsData, displayedNodeIds]);

  // Handle node click
  const handleNodeClick = useCallback(
    async (nodeId: string) => {
      // Load full node data
      const nodeData = await fetchEntityDetail(nodeId);
      selectNode(nodeId, nodeData);
      setFocusedNodeId(nodeId);

      // Expand neighbors
      const neighborIds = getNeighborIds(nodeId);
      if (neighborIds.length > 0) {
        addDisplayedNodeIds(neighborIds.slice(0, 10));
      }
    },
    [selectNode, setFocusedNodeId, getNeighborIds, addDisplayedNodeIds]
  );

  // Handle category selection
  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      selectCategory(categoryId);
      setDetailPanelOpen(false);
    },
    [selectCategory, setDetailPanelOpen]
  );

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback(
    (index: number) => {
      navigateToBreadcrumb(index);
      const item = breadcrumb[index];
      if (item) {
        handleNodeClick(item.nodeId);
      }
    },
    [navigateToBreadcrumb, breadcrumb, handleNodeClick]
  );

  // Handle home click in breadcrumb
  const handleBreadcrumbHome = useCallback(() => {
    clearBreadcrumb();
    resetGraph();
  }, [clearBreadcrumb, resetGraph]);

  // Calculate incident counts by category
  const incidentCounts = useMemo(() => {
    if (!indexData || !categories) return {};

    const counts: Record<string, number> = {};

    // Helper to find matching category ID from category/subCategory
    const findCategoryId = (category: string, subCategory?: string): string | null => {
      for (const [id, cat] of Object.entries(categories.nodes)) {
        const parts = cat.path.split('/');
        if (parts[0] === category) {
          // If subCategory exists, find exact match
          if (subCategory && parts[parts.length - 1] === subCategory) {
            return id;
          }
          // If no subCategory and this is level 1, match
          if (!subCategory && cat.level === 1) {
            return id;
          }
        }
      }
      // Fallback: return top-level category if exists
      return Object.entries(categories.nodes).find(
        ([, cat]) => cat.path === category
      )?.[0] || null;
    };

    indexData.incidents.forEach((inc: any) => {
      // Support both new (categoryId) and legacy (category/subCategory) formats
      let categoryId = inc.categoryId;
      if (!categoryId && inc.category) {
        categoryId = findCategoryId(inc.category, inc.subCategory);
      }

      if (categoryId) {
        counts[categoryId] = (counts[categoryId] || 0) + 1;
      }
    });
    return counts;
  }, [indexData, categories]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDetailPanelOpen(false);
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
  }, [setDetailPanelOpen, setSidebarOpen]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-950">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
        <p className="text-zinc-400 text-lg">데이터를 불러오는 중...</p>
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
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMenuClick={() => setSidebarOpen(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        indexData={indexData}
        onSelectNode={handleNodeClick}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleCategorySelect}
          incidentCounts={incidentCounts}
        />

        {/* Main view */}
        <main className="flex-1 lg:ml-[280px] relative">
          {/* Graph View */}
          {viewMode === "graph" && (
            <div className="absolute inset-0 bottom-10">
              <GraphView
                nodes={graphNodes}
                edges={displayedEdges}
                onSelectNode={handleNodeClick}
                physicsEnabled={physicsEnabled}
                onNetworkReady={networkRef}
                focusedNodeId={focusedNodeId}
                categories={categories}
              />
            </div>
          )}

          {/* Map View Placeholder */}
          {viewMode === "map" && (
            <div className="absolute inset-0 bottom-10 flex items-center justify-center bg-zinc-900">
              <p className="text-zinc-500">지도 뷰는 준비 중입니다</p>
            </div>
          )}

          {/* List View Placeholder */}
          {viewMode === "list" && (
            <div className="absolute inset-0 bottom-10 flex items-center justify-center bg-zinc-900">
              <p className="text-zinc-500">목록 뷰는 준비 중입니다</p>
            </div>
          )}

          {/* Control buttons */}
          <div className="absolute bottom-14 right-4 flex flex-col gap-2 z-30">
            <Button
              variant="secondary"
              size="sm"
              onClick={togglePhysics}
              className="gap-1"
              title={physicsEnabled ? "물리 효과 끄기" : "물리 효과 켜기"}
            >
              <Zap className={`h-4 w-4 ${physicsEnabled ? "text-yellow-500" : ""}`} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={resetGraph}
              className="gap-1"
              title="초기화"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-14 left-4 bg-zinc-900/90 backdrop-blur-sm rounded-lg p-3 text-xs z-30 hidden sm:block">
            <div className="text-zinc-500 mb-2 font-medium">노드 타입</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                { type: "incident", label: "사건", color: "#3b82f6" },
                { type: "person", label: "인물", color: "#ef4444" },
                { type: "location", label: "장소", color: "#22c55e" },
                { type: "phenomenon", label: "현상", color: "#f97316" },
                { type: "organization", label: "조직", color: "#8b5cf6" },
                { type: "equipment", label: "장비", color: "#6b7280" },
              ].map((item) => (
                <div key={item.type} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-zinc-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Detail Panel */}
        {detailPanelOpen && (
          <aside className="w-[400px] shrink-0 border-l border-zinc-800 hidden lg:block">
            <DetailPanel
              node={selectedNode}
              isOpen={detailPanelOpen}
              onClose={() => setDetailPanelOpen(false)}
              edges={relationsData?.edges || []}
              categories={categories}
              onSelectNode={handleNodeClick}
              indexData={indexData}
            />
          </aside>
        )}
      </div>

      {/* Footer */}
      <Footer
        breadcrumb={breadcrumb}
        onNavigate={handleBreadcrumbNavigate}
        onHome={handleBreadcrumbHome}
        totalNodes={displayedNodeIds.size}
      />

      {/* Mobile Detail Panel */}
      {detailPanelOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-zinc-950">
          <DetailPanel
            node={selectedNode}
            isOpen={detailPanelOpen}
            onClose={() => setDetailPanelOpen(false)}
            edges={relationsData?.edges || []}
            categories={categories}
            onSelectNode={handleNodeClick}
            indexData={indexData}
          />
        </div>
      )}
    </div>
  );
}
