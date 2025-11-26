export type Category = "mystery" | "crime" | "accident" | "unsolved" | "conspiracy";

export type Era = "ancient" | "modern" | "contemporary";

export interface TimelineEvent {
  date: string;
  event: string;
}

export interface Source {
  name: string;
  url: string;
}

export interface Incident {
  id: number;
  title: string;
  category: Category;
  era: Era;
  date: string;
  location: string;
  summary: string;
  description: string;
  timeline: TimelineEvent[];
  theories: string[];
  tags: string[];
  sources: Source[];
  relatedIncidents: number[];
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
};

export const categoryNames: Record<Category, string> = {
  mystery: "미스터리",
  crime: "범죄",
  accident: "사고",
  unsolved: "미제사건",
  conspiracy: "음모론",
};

export const eraNames: Record<Era, string> = {
  ancient: "고대",
  modern: "근대",
  contemporary: "현대",
};
