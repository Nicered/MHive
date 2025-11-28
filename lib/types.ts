// ============================================
// Category (카테고리 트리)
// ============================================

export interface Category {
  id: string;
  name: string;
  nameEn: string;
  level: 1 | 2 | 3;
  path: string;
  description?: string;
  parentId?: string;
  childIds: string[];
  icon?: string;
  color?: string;
  incidentCount?: number;
  sources?: string[];
}

export interface CategoryTree {
  version: string;
  root: {
    id: string;
    name: string;
    nameEn: string;
    children: string[];
  };
  nodes: Record<string, Category>;
}

// ============================================
// Node Types
// ============================================

export type NodeType = "category" | "incident" | "person" | "location" | "phenomenon" | "organization" | "equipment";

// 심각도
export type Severity = "minor" | "moderate" | "major" | "catastrophic";

// 상태
export type IncidentStatus = "ongoing" | "resolved" | "cold" | "unknown";

// 시대
export type Era = "ancient" | "medieval" | "earlyModern" | "modern" | "contemporary";

// 좌표
export interface Coordinates {
  lat: number;
  lng: number;
}

// 출처
export interface Source {
  name: string;
  url?: string;
  accessedAt?: string;
}

// 사상자
export interface Casualties {
  deaths?: number;
  injuries?: number;
  missing?: number;
  displaced?: number;
}

// ============================================
// Edge (관계)
// ============================================

export type RelationType =
  | "BELONGS_TO"
  | "TRIGGERED"
  | "RELATED_TO"
  | "SAME_SERIES"
  | "FOLLOWUP"
  | "DUPLICATE"
  | "OCCURRED_AT"
  | "AFFECTED"
  | "CAUSED_BY"
  | "PERPETRATED_BY"
  | "VICTIM"
  | "WITNESS"
  | "INVESTIGATOR"
  | "COMMITTED_BY"
  | "RESPONDED_BY"
  | "OPERATED_BY"
  | "INVOLVED"
  | "ALIAS_OF"
  | "ASSOCIATED"
  | "FAMILY"
  | "MEMBER_OF"
  | "LEADER_OF"
  | "LOCATED_IN"
  | "ADJACENT"
  | "PARENT_OF";

export interface Edge {
  id: string;
  source: string;
  target: string;
  relationType: RelationType;
  sourceType?: NodeType;
  targetType?: NodeType;
  role?: string;
  confidence?: number;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface EdgeRef {
  edgeId: string;
  targetId: string;
  targetType: NodeType;
  relationType: RelationType;
  direction: "outgoing" | "incoming";
}

// ============================================
// Timeline
// ============================================

export type TimePrecision = "datetime" | "date" | "month" | "year";

export type TimelineEventType =
  | "occurred"
  | "detected"
  | "reported"
  | "escalated"
  | "response"
  | "rescue"
  | "contained"
  | "resolved"
  | "investigation"
  | "evidence"
  | "suspect"
  | "arrest"
  | "trial"
  | "verdict"
  | "clue"
  | "theory"
  | "cold"
  | "reopened";

export interface TimelineEntry {
  id: string;
  timestamp: string;
  precision: TimePrecision;
  title: string;
  description?: string;
  eventType: TimelineEventType;
  importance: 1 | 2 | 3;
  location?: string;
  source?: string;
}

// ============================================
// 1. Incident (사건) - 핵심 노드
// ============================================

export interface Incident {
  id: string;
  type: "incident";
  originalId: string;
  categoryId: string;

  title: string;
  summary: string;
  description?: string;

  date: string;
  endDate?: string;

  location: string;
  coordinates?: Coordinates;

  severity: Severity;
  status: IncidentStatus;
  era: Era;

  casualties?: Casualties;
  timeline?: TimelineEntry[];
  edges: EdgeRef[];

  tags?: string[];
  sources: Source[];
  images?: string[];

  // Legacy fields for backward compatibility
  category?: string;
  subCategory?: string;
  theories?: string[];
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
  boundingBox?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };

  population?: number;
  riskZones?: string[];

  parentId?: string;
  childIds?: string[];
  edges: EdgeRef[];
}

// ============================================
// 3. Phenomenon (자연현상)
// ============================================

export type PhenomenonType =
  | "earthquake"
  | "tsunami"
  | "eruption"
  | "hurricane"
  | "tornado"
  | "flood";

export interface Phenomenon {
  id: string;
  type: "phenomenon";

  phenomenonType: PhenomenonType;
  name: string;
  nameLocal?: string;

  date: string;
  duration?: string;
  epicenter?: Coordinates;

  magnitude?: number;
  scale?: string;
  depth?: number;
  affectedAreaKm2?: number;

  edges: EdgeRef[];
}

// ============================================
// 4. Organization (조직)
// ============================================

export type OrgType =
  | "government"
  | "emergency"
  | "terrorist"
  | "criminal"
  | "corporate"
  | "ngo";

export interface Organization {
  id: string;
  type: "organization";

  name: string;
  nameShort?: string;
  orgType: OrgType;

  country?: string;
  jurisdiction?: string;

  foundedDate?: string;
  dissolvedDate?: string;
  isActive: boolean;

  edges: EdgeRef[];
  description?: string;
  website?: string;
}

// ============================================
// 5. Person (인물)
// ============================================

export type PersonType = "convicted" | "suspect" | "wanted";
export type PersonStatus = "at_large" | "captured" | "deceased" | "unknown";

export interface PublicDisclosure {
  date: string;
  authority: string;
  reason: string;
}

export interface PhysicalInfo {
  gender?: string;
  hair?: string;
  eyes?: string;
  height?: string;
  weight?: string;
  scars_and_marks?: string;
}

export interface Person {
  id: string;
  type: "person";
  originalId: string;

  name: string;
  aliases?: string[];
  nationality?: string;
  birthDate?: string;
  deathDate?: string;

  personType: PersonType;
  crimes?: string[];
  status: PersonStatus;

  publicDisclosure: PublicDisclosure;
  physical?: PhysicalInfo;

  edges: EdgeRef[];
  description?: string;
  sources: Source[];
  images?: string[];
}

// ============================================
// 6. Equipment (장비)
// ============================================

export type EquipmentType = "aircraft" | "vessel" | "train" | "vehicle";
export type EquipmentStatus = "active" | "destroyed" | "missing" | "decommissioned";

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

  status: EquipmentStatus;
  edges: EdgeRef[];
}

// ============================================
// Union Types
// ============================================

export type AnyNode = Incident | Location | Phenomenon | Organization | Person | Equipment;

// 그래프에서 사용할 통합 노드 인터페이스
export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  categoryId?: string;
  severity?: Severity;
  edgeCount?: number;
}

// ============================================
// Index Data (index.json)
// ============================================

export interface IndexIncident {
  id: string;
  title: string;
  categoryId: string;
  date: string;
  coordinates?: [number, number];
  severity: Severity;
  edgeCount: number;
  path: string;
}

export interface IndexPerson {
  id: string;
  name: string;
  personType: PersonType;
  status: PersonStatus;
  edgeCount: number;
}

export interface IndexLocation {
  id: string;
  name: string;
  locationType: LocationType;
  coordinates?: [number, number];
  edgeCount: number;
}

export interface IndexPhenomenon {
  id: string;
  name: string;
  phenomenonType: PhenomenonType;
  edgeCount: number;
}

export interface IndexOrganization {
  id: string;
  name: string;
  nameShort?: string;
  orgType: OrgType;
  edgeCount: number;
}

export interface IndexEquipment {
  id: string;
  name: string;
  equipmentType: EquipmentType;
  edgeCount: number;
}

export interface IndexStats {
  nodes: {
    category: number;
    incident: number;
    person: number;
    location: number;
    phenomenon: number;
    organization: number;
    equipment: number;
  };
  edges: number;
}

export interface IndexData {
  version: string;
  generatedAt: string;
  stats: IndexStats;
  incidents: IndexIncident[];
  persons: IndexPerson[];
  locations: IndexLocation[];
  phenomena: IndexPhenomenon[];
  organizations: IndexOrganization[];
  equipment: IndexEquipment[];
}

// ============================================
// Relations Data (relations.json / edges.json)
// ============================================

export interface RelationsData {
  version: string;
  generatedAt: string;
  total: number;
  edges: Edge[];
}

// ============================================
// Legacy Types (backward compatibility)
// ============================================

export type TopCategory = "crime" | "accident" | "disaster" | "mystery";
export type SubCategory =
  | "earthquake" | "tsunami" | "volcano" | "wildfire" | "hurricane" | "flood" | "tornado"
  | "aviation" | "maritime" | "industrial"
  | "murder" | "serial" | "terrorism"
  | "ufo" | "disappearance";

// ============================================
// UI Constants
// ============================================

// 노드 타입별 색상
export const nodeTypeColors: Record<NodeType, string> = {
  category: "#6366f1",
  incident: "#3b82f6",
  location: "#22c55e",
  phenomenon: "#f97316",
  organization: "#8b5cf6",
  person: "#ef4444",
  equipment: "#6b7280",
};

// 노드 타입별 한글명
export const nodeTypeNames: Record<NodeType, string> = {
  category: "카테고리",
  incident: "사건",
  location: "장소",
  phenomenon: "현상",
  organization: "조직",
  person: "인물",
  equipment: "장비",
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
  minor: "#22c55e",
  moderate: "#eab308",
  major: "#f97316",
  catastrophic: "#dc2626",
};

// 상태 한글명
export const statusNames: Record<IncidentStatus, string> = {
  ongoing: "진행 중",
  resolved: "종결",
  cold: "미제",
  unknown: "불명",
};

// 시대 한글명
export const eraNames: Record<Era, string> = {
  ancient: "고대",
  medieval: "중세",
  earlyModern: "근세",
  modern: "근대",
  contemporary: "현대",
};

// 관계 타입 한글명
export const relationTypeNames: Record<RelationType, string> = {
  BELONGS_TO: "소속",
  TRIGGERED: "유발",
  RELATED_TO: "연관",
  SAME_SERIES: "동일 연쇄",
  FOLLOWUP: "후속",
  DUPLICATE: "중복",
  OCCURRED_AT: "발생 위치",
  AFFECTED: "피해 지역",
  CAUSED_BY: "원인",
  PERPETRATED_BY: "범행 주체",
  VICTIM: "피해자",
  WITNESS: "목격자",
  INVESTIGATOR: "수사관",
  COMMITTED_BY: "범행 조직",
  RESPONDED_BY: "대응 기관",
  OPERATED_BY: "운영 주체",
  INVOLVED: "관련 장비",
  ALIAS_OF: "동일인",
  ASSOCIATED: "연관 인물",
  FAMILY: "가족",
  MEMBER_OF: "소속",
  LEADER_OF: "지도자",
  LOCATED_IN: "위치",
  ADJACENT: "인접",
  PARENT_OF: "상위",
};

// Legacy category colors (backward compatibility)
export const categoryColors: Record<TopCategory, string> = {
  crime: "#dc2626",
  accident: "#ff9f1c",
  disaster: "#e63946",
  mystery: "#6366f1",
};

// Legacy category names (backward compatibility)
export const categoryNames: Record<TopCategory, string> = {
  crime: "범죄",
  accident: "사고",
  disaster: "재난",
  mystery: "미스터리",
};

// ============================================
// Utility Functions
// ============================================

export function toGraphNode(entity: AnyNode): GraphNode {
  switch (entity.type) {
    case "incident":
      return {
        id: entity.id,
        type: "incident",
        label: (entity as Incident).title,
        description: (entity as Incident).summary,
        categoryId: (entity as Incident).categoryId,
        severity: (entity as Incident).severity,
        edgeCount: (entity as Incident).edges?.length || 0,
      };
    case "location":
      return {
        id: entity.id,
        type: "location",
        label: (entity as Location).name,
        edgeCount: (entity as Location).edges?.length || 0,
      };
    case "phenomenon":
      return {
        id: entity.id,
        type: "phenomenon",
        label: (entity as Phenomenon).name,
        edgeCount: (entity as Phenomenon).edges?.length || 0,
      };
    case "organization":
      return {
        id: entity.id,
        type: "organization",
        label: (entity as Organization).nameShort || (entity as Organization).name,
        edgeCount: (entity as Organization).edges?.length || 0,
      };
    case "person":
      return {
        id: entity.id,
        type: "person",
        label: (entity as Person).name,
        edgeCount: (entity as Person).edges?.length || 0,
      };
    case "equipment":
      return {
        id: entity.id,
        type: "equipment",
        label: (entity as Equipment).name,
        edgeCount: (entity as Equipment).edges?.length || 0,
      };
    default:
      return {
        id: (entity as AnyNode).id,
        type: "incident",
        label: "Unknown",
      };
  }
}

export function getCategoryLabel(categoryId: string, categories?: CategoryTree): string {
  if (!categories) return categoryId;
  const cat = categories.nodes[categoryId];
  return cat?.name || categoryId;
}

export function getCategoryColor(categoryId: string, categories?: CategoryTree): string {
  if (!categories) return "#6b7280";
  const cat = categories.nodes[categoryId];
  return cat?.color || "#6b7280";
}

export function getNodeTypeFromId(id: string): NodeType {
  if (id.startsWith("cat-")) return "category";
  if (id.startsWith("inc-")) return "incident";
  if (id.startsWith("per-")) return "person";
  if (id.startsWith("loc-")) return "location";
  if (id.startsWith("phe-")) return "phenomenon";
  if (id.startsWith("org-")) return "organization";
  if (id.startsWith("equ-")) return "equipment";
  return "incident";
}
