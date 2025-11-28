"use client";

import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  MapPin,
  Users,
  ExternalLink,
  AlertTriangle,
  Clock,
  Link2,
  FileText,
  ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AnyNode,
  Incident,
  Person,
  Location as LocationType,
  Edge,
  TimelineEntry,
  nodeTypeColors,
  nodeTypeNames,
  severityNames,
  severityColors,
  statusNames,
  relationTypeNames,
  getNodeTypeFromId,
  CategoryTree,
} from "@/lib/types";

type DetailTab = "overview" | "timeline" | "neighbors" | "sources";

interface DetailPanelProps {
  node: AnyNode | null;
  isOpen: boolean;
  onClose: () => void;
  edges: Edge[];
  categories?: CategoryTree | null;
  onSelectNode: (nodeId: string) => void;
  indexData?: {
    incidents: Array<{ id: string; title: string }>;
    persons: Array<{ id: string; name: string }>;
    locations: Array<{ id: string; name: string }>;
    phenomena: Array<{ id: string; name: string }>;
    organizations: Array<{ id: string; name: string; nameShort?: string }>;
    equipment: Array<{ id: string; name: string }>;
  } | null;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  if (dateStr.startsWith("-")) {
    const year = Math.abs(parseInt(dateStr.split("-")[1]));
    return `BC ${year}년`;
  }
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

// Timeline component
function TimelineView({ timeline }: { timeline: TimelineEntry[] }) {
  const [showAll, setShowAll] = useState(false);

  const sortedTimeline = [...timeline].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const displayedTimeline = showAll
    ? sortedTimeline
    : sortedTimeline.filter((t) => t.importance === 1).slice(0, 5);

  const eventTypeIcons: Record<string, string> = {
    occurred: "⚡",
    detected: "🔍",
    reported: "📢",
    escalated: "🔥",
    response: "🚨",
    rescue: "🚑",
    contained: "✅",
    resolved: "🏁",
    investigation: "🔎",
    evidence: "🔬",
    suspect: "👤",
    arrest: "🚔",
    trial: "⚖️",
    verdict: "📋",
    clue: "💡",
    theory: "🤔",
    cold: "❄️",
    reopened: "🔄",
  };

  return (
    <div className="space-y-4">
      {displayedTimeline.map((entry, index) => (
        <div key={entry.id || index} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm">
              {eventTypeIcons[entry.eventType] || "•"}
            </div>
            {index < displayedTimeline.length - 1 && (
              <div className="w-px flex-1 bg-zinc-700 my-1" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="text-xs text-zinc-500 mb-1">
              {formatDate(entry.timestamp)}
            </div>
            <div className="text-sm font-medium">{entry.title}</div>
            {entry.description && (
              <div className="text-xs text-zinc-400 mt-1">
                {entry.description}
              </div>
            )}
          </div>
        </div>
      ))}

      {sortedTimeline.length > displayedTimeline.length && !showAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full text-xs"
        >
          + {sortedTimeline.length - displayedTimeline.length}개 더 보기
        </Button>
      )}
    </div>
  );
}

// Neighbors list component
function NeighborsList({
  nodeId,
  edges,
  indexData,
  onSelectNode,
}: {
  nodeId: string;
  edges: Edge[];
  indexData: DetailPanelProps["indexData"];
  onSelectNode: (nodeId: string) => void;
}) {
  const relatedEdges = edges.filter(
    (e) => e.source === nodeId || e.target === nodeId
  );

  // Group by relation type
  const groupedByRelation: Record<string, { id: string; direction: string }[]> = {};
  relatedEdges.forEach((edge) => {
    const isSource = edge.source === nodeId;
    const neighborId = isSource ? edge.target : edge.source;
    const direction = isSource ? "outgoing" : "incoming";

    if (!groupedByRelation[edge.relationType]) {
      groupedByRelation[edge.relationType] = [];
    }
    groupedByRelation[edge.relationType].push({ id: neighborId, direction });
  });

  const getNodeLabel = (id: string): string => {
    if (!indexData) return id;
    const nodeType = getNodeTypeFromId(id);

    switch (nodeType) {
      case "incident":
        return indexData.incidents.find((i) => i.id === id)?.title || id;
      case "person":
        return indexData.persons.find((p) => p.id === id)?.name || id;
      case "location":
        return indexData.locations.find((l) => l.id === id)?.name || id;
      case "phenomenon":
        return indexData.phenomena.find((p) => p.id === id)?.name || id;
      case "organization": {
        const org = indexData.organizations.find((o) => o.id === id);
        return org?.nameShort || org?.name || id;
      }
      case "equipment":
        return indexData.equipment.find((e) => e.id === id)?.name || id;
      default:
        return id;
    }
  };

  if (Object.keys(groupedByRelation).length === 0) {
    return (
      <div className="text-sm text-zinc-500 text-center py-4">
        연결된 노드가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedByRelation).map(([relationType, neighbors]) => (
        <div key={relationType}>
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            {relationTypeNames[relationType as keyof typeof relationTypeNames] ||
              relationType}{" "}
            ({neighbors.length})
          </div>
          <div className="space-y-1">
            {neighbors.slice(0, 10).map(({ id, direction }) => {
              const nodeType = getNodeTypeFromId(id);
              return (
                <button
                  key={id}
                  onClick={() => onSelectNode(id)}
                  className="w-full flex items-center gap-2 p-2 text-sm rounded-md bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: nodeTypeColors[nodeType] }}
                  />
                  <span className="flex-1 truncate">{getNodeLabel(id)}</span>
                  <span className="text-xs text-zinc-500">
                    {nodeTypeNames[nodeType]}
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                </button>
              );
            })}
            {neighbors.length > 10 && (
              <div className="text-xs text-zinc-500 text-center py-1">
                + {neighbors.length - 10}개 더
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailPanel({
  node,
  isOpen,
  onClose,
  edges,
  categories,
  onSelectNode,
  indexData,
}: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  // Reset tab when node changes
  useEffect(() => {
    setActiveTab("overview");
  }, [node?.id]);

  if (!isOpen || !node) {
    return null;
  }

  const tabs: { id: DetailTab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "개요", icon: FileText },
    { id: "timeline", label: "타임라인", icon: Clock },
    { id: "neighbors", label: "연결", icon: Link2 },
    { id: "sources", label: "출처", icon: ExternalLink },
  ];

  // Check if incident
  const isIncident = node.type === "incident";
  const incident = isIncident ? (node as Incident) : null;

  // Get category info
  const categoryInfo = incident?.categoryId && categories
    ? categories.nodes[incident.categoryId]
    : null;

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-l border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: nodeTypeColors[node.type] }}
          />
          <span className="text-sm text-zinc-400">
            {nodeTypeNames[node.type]}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Title */}
      <div className="p-4 border-b border-zinc-800">
        {categoryInfo && (
          <Badge
            className="mb-2"
            style={{
              backgroundColor: `${categoryInfo.color}20`,
              color: categoryInfo.color,
              borderColor: categoryInfo.color,
            }}
          >
            {categoryInfo.name}
          </Badge>
        )}
        <h2 className="text-lg font-bold">
          {isIncident ? incident!.title : (node as Person).name || (node as LocationType).name}
        </h2>

        {/* Meta info for incident */}
        {incident && (
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-zinc-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(incident.date)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {incident.location}
            </span>
          </div>
        )}

        {/* Severity & Status */}
        {incident && (
          <div className="flex gap-2 mt-3">
            {incident.severity && (
              <span
                className="px-2 py-0.5 text-xs rounded"
                style={{
                  backgroundColor: `${severityColors[incident.severity]}20`,
                  color: severityColors[incident.severity],
                }}
              >
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                {severityNames[incident.severity]}
              </span>
            )}
            {incident.status && (
              <span className="px-2 py-0.5 text-xs rounded bg-zinc-800 text-zinc-300">
                {statusNames[incident.status]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {tabs.map((tab) => {
          // Hide timeline tab if no timeline data
          if (tab.id === "timeline" && (!incident?.timeline || incident.timeline.length === 0)) {
            return null;
          }
          // Hide sources tab if no sources
          if (tab.id === "sources" && (!incident?.sources || incident.sources.length === 0)) {
            return null;
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm transition-colors",
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Casualties */}
              {incident?.casualties && Object.keys(incident.casualties).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {incident.casualties.deaths !== undefined && incident.casualties.deaths > 0 && (
                    <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                      <Users className="h-3 w-3" />
                      사망 {formatNumber(incident.casualties.deaths)}
                    </span>
                  )}
                  {incident.casualties.injuries !== undefined && incident.casualties.injuries > 0 && (
                    <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                      부상 {formatNumber(incident.casualties.injuries)}
                    </span>
                  )}
                  {incident.casualties.missing !== undefined && incident.casualties.missing > 0 && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                      실종 {formatNumber(incident.casualties.missing)}
                    </span>
                  )}
                </div>
              )}

              {/* Summary */}
              {incident?.summary && (
                <div>
                  <h3 className="text-xs text-primary uppercase tracking-wider mb-2">
                    요약
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {incident.summary}
                  </p>
                </div>
              )}

              {/* Description */}
              {incident?.description && (
                <div>
                  <h3 className="text-xs text-primary uppercase tracking-wider mb-2">
                    상세 내용
                  </h3>
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {incident.description}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Tags */}
              {incident?.tags && incident.tags.length > 0 && (
                <div>
                  <h3 className="text-xs text-primary uppercase tracking-wider mb-2">
                    태그
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {incident.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-zinc-800 rounded text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Person specific fields */}
              {node.type === "person" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs text-primary uppercase tracking-wider mb-2">
                      기본 정보
                    </h3>
                    <div className="space-y-1 text-sm">
                      {(node as Person).nationality && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500">국적</span>
                          <span>{(node as Person).nationality}</span>
                        </div>
                      )}
                      {(node as Person).birthDate && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500">출생</span>
                          <span>{formatDate((node as Person).birthDate!)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "timeline" && incident?.timeline && (
            <TimelineView timeline={incident.timeline} />
          )}

          {activeTab === "neighbors" && (
            <NeighborsList
              nodeId={node.id}
              edges={edges}
              indexData={indexData}
              onSelectNode={onSelectNode}
            />
          )}

          {activeTab === "sources" && incident?.sources && (
            <div className="space-y-2">
              {incident.sources.map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 text-sm rounded-md bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 text-primary" />
                  <span className="flex-1">{source.name}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
