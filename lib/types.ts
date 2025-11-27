// 카테고리 경로 (MECE 구조)
export type CategoryPath =
  // 범죄
  | "crime/coldcase"
  | "crime/serial"
  | "crime/terrorism"
  // 사고
  | "accident/aviation"
  | "accident/maritime"
  | "accident/railway"
  | "accident/industrial"
  // 재난 - 자연
  | "disaster/natural/earthquake"
  | "disaster/natural/tsunami"
  | "disaster/natural/storm"
  | "disaster/natural/volcanic"
  // 재난 - 인적
  | "disaster/manmade/fire"
  | "disaster/manmade/collapse"
  // 미스터리
  | "mystery/unexplained"
  | "mystery/disappearance"
  | "mystery/conspiracy";

// 최상위 카테고리 (그래프 색상용)
export type TopCategory = "crime" | "accident" | "disaster" | "mystery";

export type Era = "ancient" | "modern" | "contemporary";

export type IncidentStatus = "resolved" | "ongoing" | "unsolved";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TimelineEvent {
  date: string;
  event: string;
}

export interface Source {
  name: string;
  url: string;
  fetchedAt?: string;
}

export interface Casualties {
  deaths?: number;
  injuries?: number;
  missing?: number;
  displaced?: number;
}

// index.json용 경량 메타데이터
export interface IncidentMeta {
  id: string;
  title: string;
  category: CategoryPath;
  era: Era;
  date: string;
  endDate?: string;
  location: string;
  coordinates?: Coordinates;
  summary: string;
  tags: string[];
  status?: IncidentStatus;
  relatedIncidents: string[];
  path: string; // 상세 파일 경로
}

// 개별 파일용 상세 정보
export interface IncidentDetail {
  id: string;
  description: string;
  timeline?: TimelineEvent[];
  theories?: string[];
  sources: Source[];
  images?: string[];
  casualties?: Casualties;
  metadata: {
    createdAt: string;
    updatedAt: string;
    sourceIds: string[];
  };
}

// 전체 사건 정보 (Meta + Detail 병합)
export interface Incident extends IncidentMeta {
  description: string;
  timeline?: TimelineEvent[];
  theories?: string[];
  sources: Source[];
  images?: string[];
  casualties?: Casualties;
}

// 관계 타입
export type RelationType =
  | "related"
  | "caused"
  | "similar"
  | "same_perpetrator"
  | "same_location";

export interface Relation {
  from: string;
  to: string;
  type: RelationType;
  description?: string;
}

// index.json 구조
export interface IndexData {
  metadata: {
    total: number;
    lastUpdated: string;
    version: string;
  };
  incidents: IncidentMeta[];
}

// relations.json 구조
export interface RelationsData {
  relations: Relation[];
}

// 카테고리별 색상 (최상위 기준)
export const categoryColors: Record<TopCategory, string> = {
  crime: "#e74c3c",
  accident: "#f39c12",
  disaster: "#e67e22",
  mystery: "#9b59b6",
};

// 카테고리 한글명
export const categoryNames: Record<TopCategory, string> = {
  crime: "범죄",
  accident: "사고",
  disaster: "재난",
  mystery: "미스터리",
};

// 서브카테고리 한글명
export const subCategoryNames: Record<string, string> = {
  // 범죄
  coldcase: "미제사건",
  serial: "연쇄범죄",
  terrorism: "테러",
  // 사고
  aviation: "항공",
  maritime: "해양",
  railway: "철도",
  industrial: "산업재해",
  // 재난 - 자연
  earthquake: "지진",
  tsunami: "쓰나미",
  storm: "태풍/허리케인",
  volcanic: "화산",
  // 재난 - 인적
  fire: "화재",
  collapse: "붕괴",
  // 미스터리
  unexplained: "미확인 현상",
  disappearance: "실종",
  conspiracy: "음모론",
};

export const eraNames: Record<Era, string> = {
  ancient: "고대",
  modern: "근대",
  contemporary: "현대",
};

// 유틸리티 함수
export function getTopCategory(categoryPath: CategoryPath): TopCategory {
  return categoryPath.split("/")[0] as TopCategory;
}

export function getCategoryColor(categoryPath: CategoryPath): string {
  const top = getTopCategory(categoryPath);
  return categoryColors[top];
}

export function getCategoryLabel(categoryPath: CategoryPath): string {
  const parts = categoryPath.split("/");
  const top = categoryNames[parts[0] as TopCategory];
  const sub = subCategoryNames[parts[parts.length - 1]];
  return `${top} > ${sub}`;
}
