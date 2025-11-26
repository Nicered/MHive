"use client";

import { Badge } from "@/components/ui/badge";
import { categoryColors, categoryNames, Category } from "@/lib/types";

const categories: Category[] = ["mystery", "crime", "accident", "unsolved", "conspiracy"];

export function Legend() {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 lg:left-[calc(50%+8rem)] flex flex-wrap justify-center gap-2 p-3 bg-card/90 backdrop-blur-sm rounded-lg border border-border z-30">
      {categories.map((category) => (
        <Badge
          key={category}
          variant={category}
          className="text-xs font-normal"
        >
          {categoryNames[category]}
        </Badge>
      ))}
    </div>
  );
}
