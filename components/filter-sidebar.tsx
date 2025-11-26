"use client";

import { Search, Filter, Maximize2, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Category, Era, categoryColors, categoryNames, eraNames } from "@/lib/types";

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategories: Category[];
  onCategoryChange: (category: Category, checked: boolean) => void;
  selectedEras: Era[];
  onEraChange: (era: Era, checked: boolean) => void;
  totalIncidents: number;
  totalConnections: number;
  onResetZoom: () => void;
  onTogglePhysics: () => void;
  physicsEnabled: boolean;
}

const categories: Category[] = ["mystery", "crime", "accident", "unsolved", "conspiracy"];
const eras: Era[] = ["ancient", "modern", "contemporary"];

export function FilterSidebar({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  selectedCategories,
  onCategoryChange,
  selectedEras,
  onEraChange,
  totalIncidents,
  totalConnections,
  onResetZoom,
  onTogglePhysics,
  physicsEnabled,
}: FilterSidebarProps) {
  const content = (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-1">
        {/* Mobile Search */}
        <div className="lg:hidden">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            검색
          </label>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="사건 검색..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            카테고리
          </label>
          <div className="mt-2 space-y-2">
            {categories.map((category) => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox
                  id={`cat-${category}`}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={(checked) =>
                    onCategoryChange(category, checked as boolean)
                  }
                />
                <label
                  htmlFor={`cat-${category}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: categoryColors[category] }}
                  />
                  {categoryNames[category]}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Era Filter */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            시대
          </label>
          <div className="mt-2 space-y-2">
            {eras.map((era) => (
              <div key={era} className="flex items-center space-x-2">
                <Checkbox
                  id={`era-${era}`}
                  checked={selectedEras.includes(era)}
                  onCheckedChange={(checked) =>
                    onEraChange(era, checked as boolean)
                  }
                />
                <label
                  htmlFor={`era-${era}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {eraNames[era]}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Statistics */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            통계
          </label>
          <div className="mt-2 space-y-1 text-sm">
            <p>
              총 사건: <span className="text-primary font-bold">{totalIncidents}</span>건
            </p>
            <p>
              연결된 관계:{" "}
              <span className="text-primary font-bold">{totalConnections}</span>개
            </p>
          </div>
        </div>

        <Separator />

        {/* Graph Controls */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            그래프 제어
          </label>
          <div className="mt-2 space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={onResetZoom}
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              화면 맞춤
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={onTogglePhysics}
            >
              <Zap className="h-4 w-4 mr-2" />
              물리 효과 {physicsEnabled ? "끄기" : "켜기"}
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-14 bottom-0 w-64 border-r border-border bg-card p-4 z-40">
        {content}
      </aside>

      {/* Mobile Sheet */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-80 p-4">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              필터 & 설정
            </SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
}
