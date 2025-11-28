"use client";

import { Breadcrumb } from "@/components/common/Breadcrumb";
import { BreadcrumbItem } from "@/store/useStore";

interface FooterProps {
  breadcrumb: BreadcrumbItem[];
  onNavigate: (index: number) => void;
  onHome: () => void;
  totalNodes: number;
}

export function Footer({ breadcrumb, onNavigate, onHome, totalNodes }: FooterProps) {
  return (
    <footer className="h-10 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm fixed bottom-0 left-0 lg:left-[280px] right-0 z-40">
      <Breadcrumb
        items={breadcrumb}
        onNavigate={onNavigate}
        onHome={onHome}
        totalNodes={totalNodes}
      />
    </footer>
  );
}
