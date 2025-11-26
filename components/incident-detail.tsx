"use client";

import { X, Calendar, MapPin, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Incident, Category, categoryNames } from "@/lib/types";

interface IncidentDetailProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  relatedIncidents: { incident: Incident; relation: string }[];
  onSelectIncident: (id: number) => void;
}

function formatDate(dateStr: string): string {
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

export function IncidentDetail({
  incident,
  isOpen,
  onClose,
  relatedIncidents,
  onSelectIncident,
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

  const categoryVariant = incident.category as Category;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle>상세 정보</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-60px)]">
          <div className="p-4 animate-fade-in">
            {/* Category Badge */}
            <Badge variant={categoryVariant} className="mb-3">
              {categoryNames[incident.category]}
            </Badge>

            {/* Title */}
            <h2 className="text-xl font-bold mb-3">{incident.title}</h2>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(incident.date)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {incident.location}
              </span>
            </div>

            {/* Summary */}
            <section className="mb-6">
              <h3 className="text-xs text-primary uppercase tracking-wider mb-2">
                요약
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {incident.summary}
              </p>
            </section>

            {/* Description */}
            <section className="mb-6">
              <h3 className="text-xs text-primary uppercase tracking-wider mb-2">
                상세 내용
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {incident.description}
              </p>
            </section>

            {/* Timeline */}
            {incident.timeline.length > 0 && (
              <section className="mb-6">
                <h3 className="text-xs text-primary uppercase tracking-wider mb-2">
                  타임라인
                </h3>
                <div className="timeline">
                  {incident.timeline.map((item, index) => (
                    <div key={index} className="timeline-item">
                      <div className="text-xs text-primary">{item.date}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.event}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Theories */}
            {incident.theories.length > 0 && (
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
            {incident.tags.length > 0 && (
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
                          {relation}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Sources */}
            {incident.sources.length > 0 && (
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
