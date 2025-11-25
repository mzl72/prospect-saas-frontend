"use client";

import { cn } from "@/lib/utils";

export interface Tab {
  label: string; // Max 100 chars (validado no componente)
  value: string; // Max 50 chars
  count?: number;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (value: string) => void;
  variant?: "default" | "underline";
  className?: string;
}

/**
 * Tabs component (Meta Ads style)
 *
 * @example
 * ```tsx
 * <Tabs
 *   tabs={[
 *     { label: "Todas", value: "all", count: 10 },
 *     { label: "Ativas", value: "active", count: 5 }
 *   ]}
 *   activeTab="all"
 *   onChange={(value) => setActiveTab(value)}
 *   variant="underline"
 * />
 * ```
 */
export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  className,
}: TabsProps) {
  // SECURITY: Validar e limitar tamanho de strings
  const sanitizedTabs = tabs.map(tab => ({
    ...tab,
    label: tab.label.substring(0, 100),
    value: tab.value.substring(0, 50),
  }));

  if (variant === "underline") {
    return (
      <div className={cn("border-b border-border", className)}>
        <nav className="flex space-x-8">
          {sanitizedTabs.map((tab) => {
            const isActive = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                onClick={() => onChange(tab.value)}
                className={cn(
                  "pb-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {typeof tab.count === "number" && ` (${tab.count})`}
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // Variant default (pills)
  return (
    <div className={cn("flex space-x-2", className)}>
      {sanitizedTabs.map((tab) => {
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {tab.label}
            {typeof tab.count === "number" && ` (${tab.count})`}
          </button>
        );
      })}
    </div>
  );
}
