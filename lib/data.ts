// Data loader - 분리된 파일 구조 지원
// index.json (경량 인덱스) + relations.json + 개별 파일 (lazy loading)

import {
  IndexData,
  RelationsData,
  Edge,
  Incident,
  Location,
  Phenomenon,
  Organization,
  Person,
  Equipment,
} from "./types";

// Google Drive base URL
const DRIVE_BASE_URL = process.env.NEXT_PUBLIC_DRIVE_BASE_URL || "";

// Get base path for GitHub Pages deployment
const getBasePath = () => {
  if (typeof window === "undefined") return "";
  return window.location.pathname.startsWith("/MHive") ? "/MHive" : "";
};

// 캐시
let indexDataCache: IndexData | null = null;
let relationsDataCache: RelationsData | null = null;
const entityCache = new Map<string, Incident | Location | Phenomenon | Organization | Person | Equipment>();

// ============================================
// 인덱스 데이터 로드 (앱 시작 시)
// ============================================

export async function fetchIndexData(): Promise<IndexData> {
  if (indexDataCache) {
    return indexDataCache;
  }

  const url = DRIVE_BASE_URL
    ? `${DRIVE_BASE_URL}/index.json`
    : `${getBasePath()}/data/index.json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch index data: ${response.status}`);
  }

  const data = await response.json();
  indexDataCache = data;
  return data;
}

// ============================================
// 관계 데이터 로드 (그래프 표시 시)
// ============================================

export async function fetchRelationsData(): Promise<RelationsData> {
  if (relationsDataCache) {
    return relationsDataCache;
  }

  const url = DRIVE_BASE_URL
    ? `${DRIVE_BASE_URL}/relations.json`
    : `${getBasePath()}/data/relations.json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch relations data: ${response.status}`);
  }

  const data = await response.json();
  relationsDataCache = data;
  return data;
}

// ============================================
// 개별 엔티티 로드 (Lazy Loading)
// ============================================

export async function fetchIncidentDetail(id: string): Promise<Incident | null> {
  if (entityCache.has(id)) {
    return entityCache.get(id) as Incident;
  }

  const url = DRIVE_BASE_URL
    ? `${DRIVE_BASE_URL}/incidents/${id}.json`
    : `${getBasePath()}/data/incidents/${id}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    entityCache.set(id, data);
    return data;
  } catch {
    return null;
  }
}

export async function fetchLocationDetail(id: string): Promise<Location | null> {
  if (entityCache.has(id)) {
    return entityCache.get(id) as Location;
  }

  const url = DRIVE_BASE_URL
    ? `${DRIVE_BASE_URL}/locations/${id}.json`
    : `${getBasePath()}/data/locations/${id}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    entityCache.set(id, data);
    return data;
  } catch {
    return null;
  }
}

export async function fetchPersonDetail(id: string): Promise<Person | null> {
  if (entityCache.has(id)) {
    return entityCache.get(id) as Person;
  }

  const url = DRIVE_BASE_URL
    ? `${DRIVE_BASE_URL}/persons/${id}.json`
    : `${getBasePath()}/data/persons/${id}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    entityCache.set(id, data);
    return data;
  } catch {
    return null;
  }
}

export async function fetchPhenomenonDetail(id: string): Promise<Phenomenon | null> {
  if (entityCache.has(id)) {
    return entityCache.get(id) as Phenomenon;
  }

  const url = DRIVE_BASE_URL
    ? `${DRIVE_BASE_URL}/phenomena/${id}.json`
    : `${getBasePath()}/data/phenomena/${id}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    entityCache.set(id, data);
    return data;
  } catch {
    return null;
  }
}

export async function fetchOrganizationDetail(id: string): Promise<Organization | null> {
  if (entityCache.has(id)) {
    return entityCache.get(id) as Organization;
  }

  const url = DRIVE_BASE_URL
    ? `${DRIVE_BASE_URL}/organizations/${id}.json`
    : `${getBasePath()}/data/organizations/${id}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    entityCache.set(id, data);
    return data;
  } catch {
    return null;
  }
}

export async function fetchEquipmentDetail(id: string): Promise<Equipment | null> {
  if (entityCache.has(id)) {
    return entityCache.get(id) as Equipment;
  }

  const url = DRIVE_BASE_URL
    ? `${DRIVE_BASE_URL}/equipment/${id}.json`
    : `${getBasePath()}/data/equipment/${id}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    entityCache.set(id, data);
    return data;
  } catch {
    return null;
  }
}

// ID prefix로 엔티티 타입 판별하여 적절한 fetch 함수 호출
export async function fetchEntityDetail(id: string): Promise<Incident | Location | Phenomenon | Organization | Person | Equipment | null> {
  if (entityCache.has(id)) {
    return entityCache.get(id) || null;
  }

  if (id.startsWith("incident-")) {
    return fetchIncidentDetail(id);
  } else if (id.startsWith("location-")) {
    return fetchLocationDetail(id);
  } else if (id.startsWith("person-")) {
    return fetchPersonDetail(id);
  } else if (id.startsWith("phenomenon-")) {
    return fetchPhenomenonDetail(id);
  } else if (id.startsWith("org-")) {
    return fetchOrganizationDetail(id);
  } else if (id.startsWith("equipment-")) {
    return fetchEquipmentDetail(id);
  }

  return null;
}

// ============================================
// 캐시 관리
// ============================================

export function clearIndexCache(): void {
  indexDataCache = null;
}

export function clearRelationsCache(): void {
  relationsDataCache = null;
}

export function clearEntityCache(): void {
  entityCache.clear();
}

export function clearAllCache(): void {
  clearIndexCache();
  clearRelationsCache();
  clearEntityCache();
}

// ============================================
// 유틸리티 함수
// ============================================

// Edge만 가져오기
export async function fetchEdges(): Promise<Edge[]> {
  const data = await fetchRelationsData();
  return data.edges;
}

// ============================================
// Session State (localStorage)
// ============================================

const STORAGE_KEYS = {
  DISPLAYED_NODE_IDS: "mhive_displayed_nodes",
  CLICKED_NODE_IDS: "mhive_clicked_nodes",
  FOCUSED_NODE_ID: "mhive_focused_node",
  SELECTED_INCIDENT_ID: "mhive_selected_incident",
  SELECTED_CATEGORIES: "mhive_categories",
  SELECTED_ERAS: "mhive_eras",
  LAST_VISIT: "mhive_last_visit",
} as const;

export interface SessionState {
  displayedNodeIds: string[];
  clickedNodeIds: string[];
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
    if (state.clickedNodeIds !== undefined) {
      localStorage.setItem(
        STORAGE_KEYS.CLICKED_NODE_IDS,
        JSON.stringify(state.clickedNodeIds)
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
      clickedNodeIds: JSON.parse(
        localStorage.getItem(STORAGE_KEYS.CLICKED_NODE_IDS) || "[]"
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
