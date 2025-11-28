"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Menu, Settings, X, Network, Map, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ViewMode } from "@/store/useStore";
import {
  IndexData,
  nodeTypeColors,
  nodeTypeNames,
  getNodeTypeFromId,
} from "@/lib/types";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMenuClick: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  indexData: IndexData | null;
  onSelectNode: (nodeId: string) => void;
}

interface SearchResult {
  id: string;
  title: string;
  type: string;
}

export function Header({
  searchQuery,
  onSearchChange,
  onMenuClick,
  viewMode,
  onViewModeChange,
  indexData,
  onSelectNode,
}: HeaderProps) {
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search logic
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || !indexData) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search incidents
    indexData.incidents
      .filter((i) => i.title.toLowerCase().includes(query))
      .slice(0, 5)
      .forEach((i) => results.push({ id: i.id, title: i.title, type: "incident" }));

    // Search persons
    indexData.persons
      .filter((p) => p.name.toLowerCase().includes(query))
      .slice(0, 3)
      .forEach((p) => results.push({ id: p.id, title: p.name, type: "person" }));

    // Search locations
    indexData.locations
      .filter((l) => l.name.toLowerCase().includes(query))
      .slice(0, 3)
      .forEach((l) => results.push({ id: l.id, title: l.name, type: "location" }));

    setSearchResults(results);
    setShowResults(results.length > 0);
  }, [searchQuery, indexData]);

  // Close results on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (id: string) => {
    onSelectNode(id);
    setShowResults(false);
    onSearchChange("");
  };

  const viewModes: { mode: ViewMode; icon: React.ElementType; label: string }[] = [
    { mode: "graph", icon: Network, label: "그래프" },
    { mode: "map", icon: Map, label: "지도" },
    { mode: "list", icon: List, label: "목록" },
  ];

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm flex items-center px-4 gap-4 sticky top-0 z-50">
      {/* Menu button (mobile) */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo */}
      <div className="font-bold text-lg text-white hidden sm:block">
        MHive
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xl relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="사건, 인물, 장소 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className="pl-9 pr-9 bg-zinc-800 border-zinc-700"
          />
          {searchQuery && (
            <button
              onClick={() => {
                onSearchChange("");
                setShowResults(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <div
            ref={resultsRef}
            className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg overflow-hidden z-50"
          >
            {searchResults.map((result) => {
              const nodeType = getNodeTypeFromId(result.id);
              return (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-zinc-800 transition-colors text-left"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: nodeTypeColors[nodeType] }}
                  />
                  <span className="flex-1 truncate">{result.title}</span>
                  <span className="text-xs text-zinc-500">
                    {nodeTypeNames[nodeType]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* View mode toggle */}
      <div className="hidden md:flex items-center gap-1 bg-zinc-800 rounded-md p-1">
        {viewModes.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={cn(
              "flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors",
              viewMode === mode
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-white"
            )}
            title={label}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden lg:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Settings */}
      <Button variant="ghost" size="icon">
        <Settings className="h-5 w-5" />
      </Button>
    </header>
  );
}
