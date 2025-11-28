"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CategoryTree } from "@/components/category/CategoryTree";
import { CategoryTree as CategoryTreeType } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryTreeType | null;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  incidentCounts?: Record<string, number>;
}

export function Sidebar({
  isOpen,
  onClose,
  categories,
  selectedCategoryId,
  onSelectCategory,
  incidentCounts,
}: SidebarProps) {
  const sidebarContent = categories ? (
    <CategoryTree
      categories={categories}
      selectedCategoryId={selectedCategoryId}
      onSelectCategory={onSelectCategory}
      incidentCounts={incidentCounts}
    />
  ) : (
    <div className="flex items-center justify-center h-full text-zinc-500">
      카테고리 로딩 중...
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-14 bottom-10 w-[280px] border-r border-zinc-800 bg-zinc-900 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Sheet */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="p-4 border-b border-zinc-800">
            <SheetTitle>카테고리</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-60px)]">{sidebarContent}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
