"use client";

import { Calendar, MapPin, ExternalLink, Users, Image as ImageIcon, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Incident,
  IndexIncident,
  TopCategory,
  severityNames,
  severityColors,
  relationTypeNames,
  RelationType,
  CategoryTree,
  getCategoryLabel,
} from "@/lib/types";

export interface RelatedIncidentInfo {
  incident: IndexIncident;
  relation: RelationType;
}

interface IncidentDetailProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  relatedIncidents: RelatedIncidentInfo[];
  onSelectIncident: (id: string) => void;
  categories?: CategoryTree | null;
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
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

export function IncidentDetail({
  incident,
  isOpen,
  onClose,
  relatedIncidents,
  onSelectIncident,
  categories,
}: IncidentDetailProps) {
  if (!incident) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0">
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>노드를 클릭하여 상세 정보를 확인하세요</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const topCategory = incident.category;
  const casualties = incident.casualties;
  const hasImages = incident.images && incident.images.length > 0;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle>상세 정보</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-60px)]">
          <div className="p-4 animate-fade-in">
            {/* Category Badge */}
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="mb-0">
                {getCategoryLabel(incident.categoryId, categories ?? undefined)}
              </Badge>
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
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold mb-3">{incident.title}</h2>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(incident.date)}
                {incident.endDate && ` ~ ${formatDate(incident.endDate)}`}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {incident.location}
              </span>
            </div>

            {/* Casualties */}
            {casualties && Object.keys(casualties).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {casualties.deaths !== undefined && casualties.deaths > 0 && (
                  <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                    <Users className="h-3 w-3" />
                    사망 {formatNumber(casualties.deaths)}
                  </span>
                )}
                {casualties.injuries !== undefined && casualties.injuries > 0 && (
                  <span className="flex items-center gap-1 text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                    부상 {formatNumber(casualties.injuries)}
                  </span>
                )}
                {casualties.missing !== undefined && casualties.missing > 0 && (
                  <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                    실종 {formatNumber(casualties.missing)}
                  </span>
                )}
                {casualties.displaced !== undefined && casualties.displaced > 0 && (
                  <span className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                    이재민 {formatNumber(casualties.displaced)}
                  </span>
                )}
              </div>
            )}

            {/* Images */}
            {hasImages && (
              <section className="mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {incident.images!.slice(0, 4).map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-video bg-secondary rounded overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={url}
                        alt={`${incident.title} 이미지 ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Summary */}
            <section className="mb-6">
              <h3 className="text-xs text-primary uppercase tracking-wider mb-2">
                요약
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {incident.summary}
              </p>
            </section>

            {/* Description (Markdown) */}
            {incident.description && (
              <section className="mb-6">
                <h3 className="text-xs text-primary uppercase tracking-wider mb-2">
                  상세 내용
                </h3>
                <div className="prose prose-sm prose-invert max-w-none text-muted-foreground">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                          {children}
                        </p>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-unsolved hover:underline"
                        >
                          {children}
                        </a>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1 mb-3">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1 mb-3">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-sm text-muted-foreground">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">
                          {children}
                        </strong>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground">
                          {children}
                        </blockquote>
                      ),
                      img: ({ src, alt }) => (
                        <a href={src} target="_blank" rel="noopener noreferrer">
                          <img
                            src={src}
                            alt={alt || ""}
                            className="rounded max-w-full h-auto my-2"
                          />
                        </a>
                      ),
                    }}
                  >
                    {incident.description}
                  </ReactMarkdown>
                </div>
              </section>
            )}

            {/* Timeline */}
            {incident.timeline && incident.timeline.length > 0 && (
              <section className="mb-6">
                <h3 className="text-xs text-primary uppercase tracking-wider mb-2">
                  타임라인
                </h3>
                <div className="timeline">
                  {incident.timeline.map((item, index) => (
                    <div key={item.id || index} className="timeline-item">
                      <div className="text-xs text-primary">{item.timestamp}</div>
                      <div className="text-sm font-medium">{item.title}</div>
                      {item.description && (
                        <div className="text-sm text-muted-foreground">
                          {item.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Theories */}
            {incident.theories && incident.theories.length > 0 && (
              <section className="mb-6">
                <h3 className="text-xs text-primary uppercase tracking-wider mb-2">
                  주요 가설
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {incident.theories.map((theory, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {theory}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Tags */}
            {incident.tags && incident.tags.length > 0 && (
              <section className="mb-6">
                <h3 className="text-xs text-primary uppercase tracking-wider mb-2">
                  태그
                </h3>
                <div className="flex flex-wrap gap-1">
                  {incident.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-secondary rounded border border-border text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <Separator className="my-4" />

            {/* Related Incidents */}
            {relatedIncidents.length > 0 && (
              <section className="mb-6">
                <h3 className="text-xs text-primary uppercase tracking-wider mb-2">
                  관련 사건
                </h3>
                <ul className="space-y-2">
                  {relatedIncidents.map(({ incident: related, relation }) => (
                    <li
                      key={related.id}
                      className="p-3 bg-secondary rounded-lg cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => onSelectIncident(related.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {related.title}
                        </span>
                        <span className="text-xs text-muted-foreground bg-card px-2 py-1 rounded-full">
                          {relationTypeNames[relation] || relation}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Sources */}
            {incident.sources && incident.sources.length > 0 && (
              <section>
                <h3 className="text-xs text-primary uppercase tracking-wider mb-2">
                  참고 자료
                </h3>
                <div className="space-y-1">
                  {incident.sources.map((source, index) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-unsolved hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {source.name}
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
