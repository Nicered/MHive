// Data loader for mhive_master.json
// 통합 파일에서 데이터를 로드하고 캐싱합니다

import { MasterData, Incident, Edge } from "./types";

// Google Drive base URL
const DRIVE_BASE_URL = process.env.NEXT_PUBLIC_DRIVE_BASE_URL || "";

// Get base path for GitHub Pages deployment
const getBasePath = () => {
  if (typeof window === "undefined") return "";
  return window.location.pathname.startsWith("/MHive") ? "/MHive" : "";
};

// 캐시
let masterDataCache: MasterData | null = null;

// Fetch mhive_master.json
export async function fetchMasterData(): Promise<MasterData> {
  if (masterDataCache) {
    return masterDataCache;
  }

  const url = DRIVE_BASE_URL
    ? `${DRIVE_BASE_URL}/mhive_master.json`
    : `${getBasePath()}/data/mhive_master.json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch master data: ${response.status}`);
  }

  const data = await response.json();
  masterDataCache = data;
  return data;
}

// 캐시 클리어
export function clearMasterDataCache(): void {
  masterDataCache = null;
}

// Incident만 가져오기
export async function fetchIncidents(): Promise<Incident[]> {
  const data = await fetchMasterData();
  return data.nodes.incidents;
}

// Edge만 가져오기
export async function fetchEdges(): Promise<Edge[]> {
  const data = await fetchMasterData();
  return data.edges;
}

// Incident 간 관계만 필터링 (그래프용)
export function getIncidentEdges(edges: Edge[]): Edge[] {
  return edges.filter(
    (e) =>
      e.source.startsWith("incident-") && e.target.startsWith("incident-")
  );
}

// ============================================
// Session State (localStorage)
// ============================================

const STORAGE_KEYS = {
  DISPLAYED_NODE_IDS: "mhive_displayed_nodes",
  FOCUSED_NODE_ID: "mhive_focused_node",
  SELECTED_INCIDENT_ID: "mhive_selected_incident",
  SELECTED_CATEGORIES: "mhive_categories",
  SELECTED_ERAS: "mhive_eras",
  LAST_VISIT: "mhive_last_visit",
} as const;

export interface SessionState {
  displayedNodeIds: string[];
  focusedNodeId: string | null;
  selectedIncidentId: string | null;
  selectedCategories: string[];
  selectedEras: string[];
  lastVisit: number;
}

export function saveSessionState(state: Partial<SessionState>): void {
  try {
    if (state.displayedNodeIds !== undefined) {
      localStorage.setItem(
        STORAGE_KEYS.DISPLAYED_NODE_IDS,
        JSON.stringify(state.displayedNodeIds)
      );
    }
    if (state.focusedNodeId !== undefined) {
      localStorage.setItem(
        STORAGE_KEYS.FOCUSED_NODE_ID,
        JSON.stringify(state.focusedNodeId)
      );
    }
    if (state.selectedIncidentId !== undefined) {
      localStorage.setItem(
        STORAGE_KEYS.SELECTED_INCIDENT_ID,
        JSON.stringify(state.selectedIncidentId)
      );
    }
    if (state.selectedCategories !== undefined) {
      localStorage.setItem(
        STORAGE_KEYS.SELECTED_CATEGORIES,
        JSON.stringify(state.selectedCategories)
      );
    }
    if (state.selectedEras !== undefined) {
      localStorage.setItem(
        STORAGE_KEYS.SELECTED_ERAS,
        JSON.stringify(state.selectedEras)
      );
    }
    localStorage.setItem(STORAGE_KEYS.LAST_VISIT, JSON.stringify(Date.now()));
  } catch (e) {
    console.warn("Failed to save session state:", e);
  }
}

export function loadSessionState(): SessionState | null {
  try {
    const lastVisit = localStorage.getItem(STORAGE_KEYS.LAST_VISIT);
    if (!lastVisit) return null;

    const lastVisitTime = JSON.parse(lastVisit);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - lastVisitTime > sevenDaysMs) {
      clearSessionState();
      return null;
    }

    return {
      displayedNodeIds: JSON.parse(
        localStorage.getItem(STORAGE_KEYS.DISPLAYED_NODE_IDS) || "[]"
      ),
      focusedNodeId: JSON.parse(
        localStorage.getItem(STORAGE_KEYS.FOCUSED_NODE_ID) || "null"
      ),
      selectedIncidentId: JSON.parse(
        localStorage.getItem(STORAGE_KEYS.SELECTED_INCIDENT_ID) || "null"
      ),
      selectedCategories: JSON.parse(
        localStorage.getItem(STORAGE_KEYS.SELECTED_CATEGORIES) || "[]"
      ),
      selectedEras: JSON.parse(
        localStorage.getItem(STORAGE_KEYS.SELECTED_ERAS) || "[]"
      ),
      lastVisit: lastVisitTime,
    };
  } catch (e) {
    console.warn("Failed to load session state:", e);
    return null;
  }
}

export function clearSessionState(): void {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (e) {
    console.warn("Failed to clear session state:", e);
  }
}
