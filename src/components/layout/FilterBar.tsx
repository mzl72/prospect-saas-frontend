"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterOption {
  label: string;
  value: string;
}

export interface Filter {
  label: string;
  placeholder: string;
  options: FilterOption[];
  value?: string;
  onChange: (value: string) => void;
}

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  filters?: Filter[];
  className?: string;
}

/**
 * FilterBar with search and dropdown filters (Meta Ads style)
 *
 * @example
 * ```tsx
 * <FilterBar
 *   searchPlaceholder="Buscar campanhas..."
 *   onSearchChange={(q) => setSearch(q)}
 *   filters={[
 *     {
 *       label: "Status",
 *       placeholder: "Todos os status",
 *       options: [
 *         { label: "Ativa", value: "active" },
 *         { label: "Pausada", value: "paused" }
 *       ],
 *       onChange: (v) => setStatusFilter(v)
 *     }
 *   ]}
 * />
 * ```
 */
export function FilterBar({
  searchPlaceholder = "Buscar...",
  searchValue = "",
  onSearchChange,
  filters = [],
  className,
}: FilterBarProps) {
  return (
    <div className={`bg-white border-b border-gray-200 px-6 py-4 ${className || ""}`}>
      <div className="flex items-center gap-4">
        {/* Search Input */}
        {onSearchChange && (
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
              maxLength={500}
            />
          </div>
        )}

        {/* Filters */}
        {filters.map((filter, index) => (
          <div key={index} className="min-w-[200px]">
            <Select value={filter.value} onValueChange={filter.onChange}>
              <SelectTrigger>
                <SelectValue placeholder={filter.placeholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
