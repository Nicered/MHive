"use client";

import { NodeType, nodeTypeColors, nodeTypeNames } from "@/lib/types";

const nodeTypes: NodeType[] = ["incident", "location", "phenomenon", "organization", "person", "equipment"];

// 노드 타입별 모양 아이콘
const nodeTypeIcons: Partial<Record<NodeType, string>> = {
  incident: "●",      // dot
  location: "◆",      // diamond
  phenomenon: "▲",    // triangle
  organization: "■",  // square
  person: "★",        // star
  equipment: "⬢",     // hexagon
};

export function Legend() {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 lg:left-[calc(50%+8rem)] flex flex-wrap justify-center gap-2 p-3 bg-card/90 backdrop-blur-sm rounded-lg border border-border z-30">
      {nodeTypes.map((type) => (
        <div
          key={type}
          className="flex items-center gap-1.5 px-2 py-1 text-xs"
        >
          <span style={{ color: nodeTypeColors[type], fontSize: "14px" }}>
            {nodeTypeIcons[type]}
          </span>
          <span className="text-zinc-300">{nodeTypeNames[type]}</span>
        </div>
      ))}
    </div>
  );
}
