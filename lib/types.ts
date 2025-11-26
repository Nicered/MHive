export type Category = "mystery" | "crime" | "accident" | "unsolved" | "conspiracy" | "disaster" | "terrorism";

export type Era = "ancient" | "modern" | "contemporary";

export interface TimelineEvent {
  date: string;
  event: string;
}

export interface Source {
  name: string;
  url: string;
}

export interface Casualties {
  deaths?: number;
  injuries?: number;
  missing?: number;
  displaced?: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Incident {
  id: number;
  title: string;
  category: Category;
  era: Era;
  date: string;
  endDate?: string; // 진행 중이거나 기간이 있는 사건
  location: string;
  coordinates?: Coordinates;
  summary: string;
  description: string; // 마크다운 지원
  timeline: TimelineEvent[];
  theories: string[];
  tags: string[];
  sources: Source[];
  relatedIncidents: number[];
  images?: string[]; // 이미지 URL 배열
  casualties?: Casualties;
  status?: "resolved" | "ongoing" | "unsolved"; // 사건 상태
}

export interface Relation {
  from: number;
  to: number;
  relation: string;
}

export interface IncidentsData {
  incidents: Incident[];
  relations: Relation[];
}

export const categoryColors: Record<Category, string> = {
  mystery: "#9b59b6",
  crime: "#e74c3c",
  accident: "#f39c12",
  unsolved: "#3498db",
  conspiracy: "#1abc9c",
  disaster: "#e67e22",
  terrorism: "#c0392b",
};

export const categoryNames: Record<Category, string> = {
  mystery: "미스터리",
  crime: "범죄",
  accident: "사고",
  unsolved: "미제사건",
  conspiracy: "음모론",
  disaster: "재난",
  terrorism: "테러",
};

export const eraNames: Record<Era, string> = {
  ancient: "고대",
  modern: "근대",
  contemporary: "현대",
};
