// Data loader with lazy loading support
// index.json: 초기 로딩 (목록/그래프)
// {id}.json: 상세 정보 (노드 클릭 시)

import {
  IndexData,
  RelationsData,
  IncidentMeta,
  IncidentDetail,
  Incident,
  Relation,
} from "./types";

// Google Drive base URL
const DRIVE_BASE_URL = process.env.NEXT_PUBLIC_DRIVE_BASE_URL || "";

// Get base path for GitHub Pages deployment
const getBasePath = () => {
  if (typeof window === "undefined") return "";
  return window.location.pathname.startsWith("/MHive") ? "/MHive" : "";
};

// 캐시 (상세 정보용)
const detailCache = new Map<string, IncidentDetail>();

// Fetch index.json (목록/그래프용 메타데이터)
export async function fetchIndexData(): Promise<IndexData> {
  const url = DRIVE_BASE_URL
    ? `${DRIVE_BASE_URL}/index.json`
    : `${getBasePath()}/data/index.json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch index data: ${response.status}`);
  }
  return response.json();
}

// Fetch relations.json (그래프 연결 관계)
export async function fetchRelationsData(): Promise<RelationsData> {
  const url = DRIVE_BASE_URL
    ? `${DRIVE_BASE_URL}/relations.json`
    : `${getBasePath()}/data/relations.json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch relations data: ${response.status}`);
  }
  return response.json();
}

// Fetch incident detail (상세 정보 - lazy loading)
export async function fetchIncidentDetail(
  path: string
): Promise<IncidentDetail> {
  // 캐시 확인
  if (detailCache.has(path)) {
    return detailCache.get(path)!;
  }

  const url = DRIVE_BASE_URL
    ? `${DRIVE_BASE_URL}/${path}`
    : `${getBasePath()}/data/${path}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch incident detail: ${response.status}`);
  }

  const detail = await response.json();
  detailCache.set(path, detail);
  return detail;
}

// Meta + Detail 병합하여 전체 Incident 반환
export async function fetchFullIncident(meta: IncidentMeta): Promise<Incident> {
  const detail = await fetchIncidentDetail(meta.path);
  return {
    ...meta,
    description: detail.description,
    timeline: detail.timeline,
    theories: detail.theories,
    sources: detail.sources,
    images: detail.images,
    casualties: detail.casualties,
  };
}

// 초기 데이터 로딩 (index + relations)
export async function fetchInitialData(): Promise<{
  index: IndexData;
  relations: RelationsData;
}> {
  const [index, relations] = await Promise.all([
    fetchIndexData(),
    fetchRelationsData(),
  ]);
  return { index, relations };
}

// 캐시 클리어
export function clearDetailCache(): void {
  detailCache.clear();
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
