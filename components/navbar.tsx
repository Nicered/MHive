"use client";

import { Search, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalIncidents: number;
  totalConnections: number;
  onMenuClick: () => void;
}

export function Navbar({
  searchQuery,
  onSearchChange,
  totalIncidents,
  totalConnections,
  onMenuClick,
}: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 px-4">
      <div className="flex items-center justify-between h-full max-w-full">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <a href="#" className="flex items-center gap-2 font-bold text-primary">
            <Search className="h-5 w-5" />
            <span>MHive</span>
          </a>
        </div>

        <div className="hidden lg:flex items-center gap-4 flex-1 justify-end">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="사건 검색..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">사건 {totalIncidents}</Badge>
            <Badge variant="secondary">연결 {totalConnections}</Badge>
          </div>
        </div>
      </div>
    </nav>
  );
}
