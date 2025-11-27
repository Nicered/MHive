// ============================================
// Node Types
// ============================================

// 최상위 카테고리
export type TopCategory = "crime" | "accident" | "disaster" | "mystery";

// 서브카테고리
export type SubCategory =
  // disaster
  | "earthquake"
  | "tsunami"
  | "volcano"
  | "wildfire"
  | "hurricane"
  | "flood"
  | "tornado"
  // accident
  | "aviation"
  | "maritime"
  | "industrial"
  // crime
  | "murder"
  | "serial"
  | "terrorism"
  // mystery
  | "ufo"
  | "disappearance";

// 시대
export type Era = "ancient" | "modern" | "contemporary";

// 심각도
export type Severity = "minor" | "moderate" | "major" | "catastrophic";

// 상태
export type IncidentStatus = "resolved" | "ongoing" | "unsolved";

// 좌표
export interface Coordinates {
  lat: number;
  lng: number;
}

// 타임라인 이벤트
export interface TimelineEvent {
  date: string;
  event: string;
}

// 출처
export interface Source {
  name: string;
  url: string;
  fetchedAt?: string;
}

// 사상자
export interface Casualties {
  deaths?: number;
  injuries?: number;
  missing?: number;
  displaced?: number;
}

// 연관 엔티티
export interface RelatedEntities {
  locations?: string[];
  phenomena?: string[];
  organizations?: string[];
  persons?: string[];
  equipment?: string[];
}

// ============================================
// 1. Incident (사건) - 핵심 노드
// ============================================
export interface Incident {
  id: string;
  type: "incident";
  title: string;
  category: TopCategory;
  subCategory: SubCategory;
  era: Era;
  date: string;
  endDate?: string;
  location: string;
  coordinates?: Coordinates;
  summary: string;
  description: string;
  severity?: Severity;
  status?: IncidentStatus;
  tags: string[];
  casualties?: Casualties;
  timeline?: TimelineEvent[];
  theories?: string[];
  sources: Source[];
  images?: string[];
  relatedEntities?: RelatedEntities;
}

// ============================================
// 2. Location (위치)
// ============================================
export type LocationType =
  | "country"
  | "state"
  | "city"
  | "region"
  | "ocean"
  | "mountain"
  | "fault_line"
  | "volcano_site"
  | "airport"
  | "building";

export interface Location {
  id: string;
  type: "location";
  name: string;
  nameLocal?: string;
  locationType: LocationType;
  country?: string;
  countryCode?: string;
  state?: string;
  city?: string;
  coordinates?: Coordinates;
  elevation?: number;
  population?: number;
  riskZones?: string[];
  parentLocation?: string;
}

// ============================================
// 3. Phenomenon (자연현상)
// ============================================
export type PhenomenonType =
  | "earthquake"
  | "eruption"
  | "hurricane"
  | "tornado"
  | "flood"
  | "drought"
  | "heatwave";

export interface Phenomenon {
  id: string;
  type: "phenomenon";
  phenomenonType: PhenomenonType;
  name: string;
  nameLocal?: string;
  date: string;
  magnitude?: number;
  scale?: string;
  depth?: number;
  duration?: string;
  affectedAreaKm2?: number;
  epicenter?: Coordinates;
  description?: string;
  triggeredEvents?: string[];
}

// ============================================
// 4. Organization (단체/조직)
// ============================================
export type OrgType =
  | "government"
  | "emergency"
  | "scientific"
  | "criminal"
  | "terrorist"
  | "corporate"
  | "ngo";

export interface Organization {
  id: string;
  type: "organization";
  name: string;
  nameShort?: string;
  orgType: OrgType;
  jurisdiction?: string;
  country?: string;
  foundedDate?: string;
  description?: string;
  website?: string;
}

// ============================================
// 5. Person (인물) - 신상공개 범죄자만
// ============================================
export type PersonType = "convicted" | "suspect" | "wanted";

export interface PublicDisclosure {
  date: string;
  authority: string;
  reason: string;
}

export interface Person {
  id: string;
  type: "person";
  name: string;
  aliases?: string[];
  personType: PersonType;
  crimes?: string[];
  status?: string;
  nationality?: string;
  birthDate?: string;
  deathDate?: string;
  convictionDate?: string;
  sentence?: string;
  description?: string;
  publicDisclosure: PublicDisclosure;
  sources?: Source[];
}

// ============================================
// 6. Equipment (장비)
// ============================================
export type EquipmentType =
  | "aircraft"
  | "vessel"
  | "vehicle"
  | "train"
  | "building"
  | "facility";

export interface Equipment {
  id: string;
  type: "equipment";
  equipmentType: EquipmentType;
  name: string;
  model?: string;
  manufacturer?: string;
  registration?: string;
  operator?: string;
  capacity?: number;
  yearBuilt?: number;
  status?: string;
}

// ============================================
// Edge (관계)
// ============================================
export type RelationType =
  | "OCCURRED_AT"
  | "CAUSED_BY"
  | "TRIGGERED"
  | "RELATED_TO"
  | "PERPETRATOR_OF"
  | "RESPONDED_TO"
  | "OPERATED_BY"
  | "MEMBER_OF"
  | "LOCATED_IN"
  | "AFFECTED";

export interface Edge {
  id: string;
  source: string;
  target: string;
  relationType: RelationType;
  role?: string;
  confidence?: number;
  description?: string;
  startDate?: string;
}

// ============================================
// Master Data (mhive_master.json)
// ============================================
export interface MasterDataStats {
  total_incidents: number;
  total_relations: number;
  total_locations: number;
  total_phenomena: number;
  categories: Record<TopCategory, number>;
}

export interface MasterDataNodes {
  incidents: Incident[];
  locations?: Location[];
  phenomena?: Phenomenon[];
  organizations?: Organization[];
  persons?: Person[];
  equipment?: Equipment[];
}

export interface MasterData {
  version: string;
  generated_at: string;
  stats: MasterDataStats;
  nodes: MasterDataNodes;
  edges: Edge[];
}

// ============================================
// 통합 노드 타입 (그래프용)
// ============================================

export type NodeType = "incident" | "location" | "phenomenon" | "organization" | "person" | "equipment";

// 그래프에서 사용할 통합 노드 인터페이스
export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
}

// 각 엔티티를 GraphNode로 변환
export function toGraphNode(entity: Incident | Location | Phenomenon | Organization | Person | Equipment): GraphNode {
  switch (entity.type) {
    case "incident":
      return {
        id: entity.id,
        type: "incident",
        label: (entity as Incident).title,
        description: (entity as Incident).summary,
      };
    case "location":
      return {
        id: entity.id,
        type: "location",
        label: (entity as Location).name,
        description: (entity as Location).country,
      };
    case "phenomenon":
      return {
        id: entity.id,
        type: "phenomenon",
        label: (entity as Phenomenon).name,
        description: (entity as Phenomenon).description,
      };
    case "organization":
      return {
        id: entity.id,
        type: "organization",
        label: (entity as Organization).nameShort || (entity as Organization).name,
        description: (entity as Organization).description,
      };
    case "person":
      return {
        id: entity.id,
        type: "person",
        label: (entity as Person).name,
        description: (entity as Person).description,
      };
    case "equipment":
      return {
        id: entity.id,
        type: "equipment",
        label: (entity as Equipment).name,
        description: (entity as Equipment).model,
      };
    default:
      return {
        id: (entity as any).id,
        type: "incident",
        label: "Unknown",
      };
  }
}

// 노드 타입별 색상
export const nodeTypeColors: Record<NodeType, string> = {
  incident: "#3b82f6",    // blue
  location: "#22c55e",    // green
  phenomenon: "#f97316",  // orange
  organization: "#8b5cf6", // purple
  person: "#ef4444",      // red
  equipment: "#6b7280",   // gray
};

// 노드 타입별 한글명
export const nodeTypeNames: Record<NodeType, string> = {
  incident: "사건",
  location: "장소",
  phenomenon: "현상",
  organization: "단체",
  person: "인물",
  equipment: "장비",
};

// ============================================
// UI용 상수 및 유틸리티
// ============================================

// 카테고리별 색상
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
export const subCategoryNames: Record<SubCategory, string> = {
  // disaster
  earthquake: "지진",
  tsunami: "쓰나미",
  volcano: "화산",
  wildfire: "산불",
  hurricane: "허리케인/태풍",
  flood: "홍수",
  tornado: "토네이도",
  // accident
  aviation: "항공",
  maritime: "해양",
  industrial: "산업재해",
  // crime
  murder: "살인",
  serial: "연쇄범죄",
  terrorism: "테러",
  // mystery
  ufo: "UFO/UAP",
  disappearance: "실종",
};

// 시대 한글명
export const eraNames: Record<Era, string> = {
  ancient: "고대",
  modern: "근대",
  contemporary: "현대",
};

// 심각도 한글명
export const severityNames: Record<Severity, string> = {
  minor: "경미",
  moderate: "보통",
  major: "심각",
  catastrophic: "대재앙",
};

// 심각도 색상
export const severityColors: Record<Severity, string> = {
  minor: "#10b981",
  moderate: "#f59e0b",
  major: "#ef4444",
  catastrophic: "#7c3aed",
};

// 관계 타입 한글명
export const relationTypeNames: Record<RelationType, string> = {
  OCCURRED_AT: "발생 장소",
  CAUSED_BY: "원인",
  TRIGGERED: "유발",
  RELATED_TO: "관련",
  PERPETRATOR_OF: "범인",
  RESPONDED_TO: "대응",
  OPERATED_BY: "운영",
  MEMBER_OF: "소속",
  LOCATED_IN: "위치",
  AFFECTED: "피해",
};

// ============================================
// 유틸리티 함수
// ============================================

export function getCategoryColor(category: TopCategory): string {
  return categoryColors[category] || "#6b7280";
}

export function getCategoryLabel(
  category: TopCategory,
  subCategory?: SubCategory
): string {
  const top = categoryNames[category];
  if (subCategory && subCategoryNames[subCategory]) {
    return `${top} > ${subCategoryNames[subCategory]}`;
  }
  return top;
}

export function getSeverityColor(severity: Severity): string {
  return severityColors[severity] || "#6b7280";
}

// ============================================
// Index Data (index.json) - 경량 인덱스
// ============================================

export interface IndexIncident {
  id: string;
  title: string;
  category: TopCategory;
  subCategory: SubCategory;
  era: Era;
  date: string;
  coordinates?: Coordinates;
  severity?: Severity;
}

export interface IndexLocation {
  id: string;
  name: string;
  locationType: LocationType;
  coordinates?: Coordinates;
  incident_count: number;
}

export interface IndexPerson {
  id: string;
  name: string;
  personType: PersonType;
  incident_count: number;
}

export interface IndexPhenomenon {
  id: string;
  name: string;
  phenomenonType: PhenomenonType;
  incident_count: number;
}

export interface IndexOrganization {
  id: string;
  name: string;
  nameShort?: string;
  orgType: OrgType;
  incident_count: number;
}

export interface IndexEquipment {
  id: string;
  name: string;
  equipmentType: EquipmentType;
  incident_count: number;
}

export interface IndexStats {
  total_incidents: number;
  total_relations: number;
  total_locations: number;
  total_phenomena?: number;
  total_persons?: number;
  categories: Record<TopCategory, number>;
}

export interface IndexData {
  version: string;
  generated_at: string;
  stats: IndexStats;
  incidents: IndexIncident[];
  locations: IndexLocation[];
  persons: IndexPerson[];
  phenomena: IndexPhenomenon[];
  organizations: IndexOrganization[];
  equipment: IndexEquipment[];
}

// ============================================
// Relations Data (relations.json)
// ============================================

export interface RelationsData {
  version: string;
  generated_at: string;
  total: number;
  edges: Edge[];
}
