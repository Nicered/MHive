"use client";

import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { BreadcrumbItem } from "@/store/useStore";
import { nodeTypeColors } from "@/lib/types";

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (index: number) => void;
  onHome: () => void;
  totalNodes?: number;
}

export function Breadcrumb({ items, onNavigate, onHome, totalNodes }: BreadcrumbProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-between px-4 py-2 text-sm text-zinc-500">
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4" />
          <span>노드를 선택하여 탐색을 시작하세요</span>
        </div>
        {totalNodes !== undefined && (
          <span className="text-xs">
            총 {totalNodes.toLocaleString()}개 노드
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 overflow-hidden">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        <button
          onClick={onHome}
          className="flex items-center gap-1 px-2 py-1 text-sm text-zinc-400 hover:text-white rounded transition-colors shrink-0"
        >
          <Home className="h-4 w-4" />
        </button>

        {items.map((item, index) => (
          <div key={`${item.nodeId}-${index}`} className="flex items-center shrink-0">
            <ChevronRight className="h-4 w-4 text-zinc-600" />
            <button
              onClick={() => onNavigate(index)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors max-w-[200px]",
                index === items.length - 1
                  ? "text-white font-medium"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: nodeTypeColors[item.nodeType] }}
              />
              <span className="truncate">{item.title}</span>
            </button>
          </div>
        ))}
      </div>

      {totalNodes !== undefined && (
        <span className="text-xs text-zinc-500 shrink-0 ml-4">
          {totalNodes.toLocaleString()}개 표시 중
        </span>
      )}
    </div>
  );
}
