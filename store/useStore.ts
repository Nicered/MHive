"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CategoryTree,
  IndexData,
  RelationsData,
  Edge,
  Incident,
  GraphNode,
  NodeType,
  AnyNode,
  getNodeTypeFromId,
} from "@/lib/types";

// ============================================
// Breadcrumb
// ============================================

export interface BreadcrumbItem {
  nodeId: string;
  nodeType: NodeType;
  title: string;
  timestamp: number;
}

// ============================================
// View Mode
// ============================================

export type ViewMode = "graph" | "map" | "list";
export type DetailTab = "overview" | "timeline" | "neighbors" | "sources";

// ============================================
// Store State
// ============================================

interface StoreState {
  // Data
  categories: CategoryTree | null;
  indexData: IndexData | null;
  relationsData: RelationsData | null;

  // Loading
  isLoading: boolean;
  loadError: string | null;

  // View
  viewMode: ViewMode;
  detailTab: DetailTab;
  sidebarOpen: boolean;
  detailPanelOpen: boolean;

  // Selection
  selectedCategoryId: string | null;
  selectedNodeId: string | null;
  selectedNode: AnyNode | null;

  // Graph state
  displayedNodeIds: Set<string>;
  focusedNodeId: string | null;
  physicsEnabled: boolean;

  // Breadcrumb
  breadcrumb: BreadcrumbItem[];

  // Search
  searchQuery: string;

  // Filters
  filters: {
    nodeTypes: NodeType[];
    severities: string[];
    dateRange: [string, string] | null;
  };
}

interface StoreActions {
  // Data setters
  setCategories: (categories: CategoryTree) => void;
  setIndexData: (indexData: IndexData) => void;
  setRelationsData: (relationsData: RelationsData) => void;
  setLoading: (isLoading: boolean) => void;
  setLoadError: (error: string | null) => void;

  // View actions
  setViewMode: (mode: ViewMode) => void;
  setDetailTab: (tab: DetailTab) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setDetailPanelOpen: (open: boolean) => void;

  // Selection actions
  selectCategory: (categoryId: string | null) => void;
  selectNode: (nodeId: string | null, node?: AnyNode | null) => void;

  // Graph actions
  setDisplayedNodeIds: (ids: Set<string>) => void;
  addDisplayedNodeIds: (ids: string[]) => void;
  setFocusedNodeId: (id: string | null) => void;
  togglePhysics: () => void;
  resetGraph: () => void;

  // Breadcrumb actions
  addToBreadcrumb: (item: BreadcrumbItem) => void;
  navigateToBreadcrumb: (index: number) => void;
  clearBreadcrumb: () => void;

  // Search & Filter
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<StoreState["filters"]>) => void;

  // Utilities
  getEdgesForNode: (nodeId: string) => Edge[];
  getNeighborIds: (nodeId: string) => string[];
  getGraphNodesFromIndex: () => GraphNode[];
}

// ============================================
// Store
// ============================================

export const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      // Initial state
      categories: null,
      indexData: null,
      relationsData: null,
      isLoading: true,
      loadError: null,
      viewMode: "graph",
      detailTab: "overview",
      sidebarOpen: true,
      detailPanelOpen: false,
      selectedCategoryId: null,
      selectedNodeId: null,
      selectedNode: null,
      displayedNodeIds: new Set(),
      focusedNodeId: null,
      physicsEnabled: true,
      breadcrumb: [],
      searchQuery: "",
      filters: {
        nodeTypes: ["incident", "person", "location", "phenomenon", "organization", "equipment"],
        severities: [],
        dateRange: null,
      },

      // Data setters
      setCategories: (categories) => set({ categories }),
      setIndexData: (indexData) => set({ indexData }),
      setRelationsData: (relationsData) => set({ relationsData }),
      setLoading: (isLoading) => set({ isLoading }),
      setLoadError: (loadError) => set({ loadError }),

      // View actions
      setViewMode: (viewMode) => set({ viewMode }),
      setDetailTab: (detailTab) => set({ detailTab }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setDetailPanelOpen: (detailPanelOpen) => set({ detailPanelOpen }),

      // Selection actions
      selectCategory: (categoryId) => {
        set({ selectedCategoryId: categoryId });

        // When selecting a category, filter incidents
        const { indexData, categories } = get();
        if (categoryId && indexData && categories) {
          const category = categories.nodes[categoryId];
          if (category) {
            // Get all child category IDs (including nested)
            const getAllChildIds = (catId: string): string[] => {
              const cat = categories.nodes[catId];
              if (!cat) return [catId];
              if (cat.childIds.length === 0) return [catId];
              return [catId, ...cat.childIds.flatMap(getAllChildIds)];
            };

            const relevantCategoryIds = getAllChildIds(categoryId);
            const filteredIncidentIds = indexData.incidents
              .filter((inc) => relevantCategoryIds.includes(inc.categoryId))
              .slice(0, 50)
              .map((inc) => inc.id);

            set({ displayedNodeIds: new Set(filteredIncidentIds) });
          }
        }
      },

      selectNode: (nodeId, node = null) => {
        set({
          selectedNodeId: nodeId,
          selectedNode: node,
          detailPanelOpen: nodeId !== null,
        });

        if (nodeId) {
          const nodeType = getNodeTypeFromId(nodeId);
          const { indexData } = get();

          // Find title from index
          let title = nodeId;
          if (indexData) {
            if (nodeType === "incident") {
              title = indexData.incidents.find((i) => i.id === nodeId)?.title || nodeId;
            } else if (nodeType === "person") {
              title = indexData.persons.find((p) => p.id === nodeId)?.name || nodeId;
            } else if (nodeType === "location") {
              title = indexData.locations.find((l) => l.id === nodeId)?.name || nodeId;
            }
          }

          get().addToBreadcrumb({
            nodeId,
            nodeType,
            title,
            timestamp: Date.now(),
          });
        }
      },

      // Graph actions
      setDisplayedNodeIds: (displayedNodeIds) => set({ displayedNodeIds }),

      addDisplayedNodeIds: (ids) => set((state) => ({
        displayedNodeIds: new Set([...state.displayedNodeIds, ...ids]),
      })),

      setFocusedNodeId: (focusedNodeId) => set({ focusedNodeId }),

      togglePhysics: () => set((state) => ({ physicsEnabled: !state.physicsEnabled })),

      resetGraph: () => {
        const { indexData } = get();
        if (indexData) {
          const initialIds = indexData.incidents.slice(0, 20).map((i) => i.id);
          set({
            displayedNodeIds: new Set(initialIds),
            focusedNodeId: null,
            selectedNodeId: null,
            selectedNode: null,
            detailPanelOpen: false,
            breadcrumb: [],
          });
        }
      },

      // Breadcrumb actions
      addToBreadcrumb: (item) => set((state) => {
        // Don't add if already the last item
        if (state.breadcrumb.length > 0 &&
            state.breadcrumb[state.breadcrumb.length - 1].nodeId === item.nodeId) {
          return state;
        }

        // Keep max 10 items
        const newBreadcrumb = [...state.breadcrumb, item].slice(-10);
        return { breadcrumb: newBreadcrumb };
      }),

      navigateToBreadcrumb: (index) => set((state) => ({
        breadcrumb: state.breadcrumb.slice(0, index + 1),
        selectedNodeId: state.breadcrumb[index]?.nodeId || null,
        focusedNodeId: state.breadcrumb[index]?.nodeId || null,
      })),

      clearBreadcrumb: () => set({ breadcrumb: [] }),

      // Search & Filter
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters },
      })),

      // Utilities
      getEdgesForNode: (nodeId) => {
        const { relationsData } = get();
        if (!relationsData) return [];
        return relationsData.edges.filter(
          (e) => e.source === nodeId || e.target === nodeId
        );
      },

      getNeighborIds: (nodeId) => {
        const { relationsData } = get();
        if (!relationsData) return [];

        const neighborIds = new Set<string>();
        relationsData.edges.forEach((e) => {
          if (e.source === nodeId) neighborIds.add(e.target);
          if (e.target === nodeId) neighborIds.add(e.source);
        });
        return Array.from(neighborIds);
      },

      getGraphNodesFromIndex: () => {
        const { indexData, displayedNodeIds } = get();
        if (!indexData) return [];

        const nodes: GraphNode[] = [];

        displayedNodeIds.forEach((id) => {
          const nodeType = getNodeTypeFromId(id);

          if (nodeType === "incident") {
            const inc = indexData.incidents.find((i) => i.id === id);
            if (inc) {
              nodes.push({
                id: inc.id,
                type: "incident",
                label: inc.title,
                categoryId: inc.categoryId,
                severity: inc.severity,
                edgeCount: inc.edgeCount,
              });
            }
          } else if (nodeType === "person") {
            const per = indexData.persons.find((p) => p.id === id);
            if (per) {
              nodes.push({
                id: per.id,
                type: "person",
                label: per.name,
                edgeCount: per.edgeCount,
              });
            }
          } else if (nodeType === "location") {
            const loc = indexData.locations.find((l) => l.id === id);
            if (loc) {
              nodes.push({
                id: loc.id,
                type: "location",
                label: loc.name,
                edgeCount: loc.edgeCount,
              });
            }
          } else if (nodeType === "phenomenon") {
            const phe = indexData.phenomena.find((p) => p.id === id);
            if (phe) {
              nodes.push({
                id: phe.id,
                type: "phenomenon",
                label: phe.name,
                edgeCount: phe.edgeCount,
              });
            }
          } else if (nodeType === "organization") {
            const org = indexData.organizations.find((o) => o.id === id);
            if (org) {
              nodes.push({
                id: org.id,
                type: "organization",
                label: org.nameShort || org.name,
                edgeCount: org.edgeCount,
              });
            }
          } else if (nodeType === "equipment") {
            const equ = indexData.equipment.find((e) => e.id === id);
            if (equ) {
              nodes.push({
                id: equ.id,
                type: "equipment",
                label: equ.name,
                edgeCount: equ.edgeCount,
              });
            }
          }
        });

        return nodes;
      },
    }),
    {
      name: "mhive-store",
      partialize: (state) => ({
        viewMode: state.viewMode,
        sidebarOpen: state.sidebarOpen,
        physicsEnabled: state.physicsEnabled,
        selectedCategoryId: state.selectedCategoryId,
        // Note: displayedNodeIds is a Set, need to convert for persistence
        displayedNodeIdsArray: Array.from(state.displayedNodeIds),
      }),
      onRehydrateStorage: () => (state) => {
        // Convert array back to Set after rehydration
        if (state && (state as unknown as { displayedNodeIdsArray?: string[] }).displayedNodeIdsArray) {
          state.displayedNodeIds = new Set((state as unknown as { displayedNodeIdsArray: string[] }).displayedNodeIdsArray);
        }
      },
    }
  )
);
