"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Flame,
  AlertCircle,
  ShieldAlert,
  HelpCircle,
  CloudLightning,
  AlertTriangle,
  Plane,
  Truck,
  Skull,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Category, CategoryTree as CategoryTreeType } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CategoryTreeProps {
  categories: CategoryTreeType;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  incidentCounts?: Record<string, number>;
}

// Icon mapping
const categoryIcons: Record<string, React.ElementType> = {
  flame: Flame,
  "alert-circle": AlertCircle,
  "shield-alert": ShieldAlert,
  "help-circle": HelpCircle,
  "cloud-lightning": CloudLightning,
  "alert-triangle": AlertTriangle,
  plane: Plane,
  truck: Truck,
  skull: Skull,
  activity: CloudLightning,
  waves: CloudLightning,
  mountain: Flame,
  wind: CloudLightning,
  tornado: CloudLightning,
  droplets: CloudLightning,
  anchor: Plane,
  "train-front": Truck,
  car: Truck,
  "hard-hat": AlertTriangle,
  pickaxe: AlertTriangle,
  construction: AlertTriangle,
  flask: AlertTriangle,
  bomb: ShieldAlert,
  "user-x": ShieldAlert,
  link: ShieldAlert,
  crosshair: ShieldAlert,
  "user-search": HelpCircle,
  ufo: HelpCircle,
  "file-question": HelpCircle,
};

interface CategoryNodeProps {
  category: Category;
  categories: CategoryTreeType;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  incidentCounts?: Record<string, number>;
  level: number;
}

function CategoryNode({
  category,
  categories,
  selectedCategoryId,
  onSelectCategory,
  incidentCounts,
  level,
}: CategoryNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  const hasChildren = category.childIds.length > 0;
  const isSelected = selectedCategoryId === category.id;

  // Get icon component
  const IconComponent = category.icon
    ? categoryIcons[category.icon] || Flame
    : Flame;

  // Calculate total incident count (including children)
  const totalCount = useMemo(() => {
    if (incidentCounts) {
      if (hasChildren) {
        const getAllChildIds = (catId: string): string[] => {
          const cat = categories.nodes[catId];
          if (!cat) return [catId];
          if (cat.childIds.length === 0) return [catId];
          return [catId, ...cat.childIds.flatMap(getAllChildIds)];
        };
        const allIds = getAllChildIds(category.id);
        return allIds.reduce((sum, id) => sum + (incidentCounts[id] || 0), 0);
      }
      return incidentCounts[category.id] || category.incidentCount || 0;
    }
    return category.incidentCount || 0;
  }, [category, categories, incidentCounts, hasChildren]);

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onSelectCategory(category.id);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors text-left",
          isSelected
            ? "bg-primary/20 text-primary"
            : "text-zinc-300 hover:bg-zinc-800"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
          )
        ) : (
          <span className="w-4" />
        )}

        <IconComponent
          className="h-4 w-4 shrink-0"
          style={{ color: category.color }}
        />

        <span className="truncate flex-1">{category.name}</span>

        {totalCount > 0 && (
          <span className="text-xs text-zinc-500 tabular-nums">
            {totalCount.toLocaleString()}
          </span>
        )}
      </button>

      {hasChildren && isExpanded && (
        <div>
          {category.childIds.map((childId) => {
            const childCategory = categories.nodes[childId];
            if (!childCategory) return null;
            return (
              <CategoryNode
                key={childId}
                category={childCategory}
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={onSelectCategory}
                incidentCounts={incidentCounts}
                level={level + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CategoryTree({
  categories,
  selectedCategoryId,
  onSelectCategory,
  incidentCounts,
}: CategoryTreeProps) {
  if (!categories) {
    return (
      <div className="p-4 text-sm text-zinc-500">
        카테고리를 불러오는 중...
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        <div className="px-2 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          카테고리
        </div>

        {categories.root.children.map((categoryId) => {
          const category = categories.nodes[categoryId];
          if (!category) return null;
          return (
            <CategoryNode
              key={categoryId}
              category={category}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={onSelectCategory}
              incidentCounts={incidentCounts}
              level={0}
            />
          );
        })}

        {/* Recent nodes section */}
        <div className="mt-6 pt-4 border-t border-zinc-800">
          <div className="px-2 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <History className="h-3 w-3" />
            최근 본 노드
          </div>
          <div className="px-2 py-2 text-xs text-zinc-500">
            노드를 선택하면 여기에 표시됩니다
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
