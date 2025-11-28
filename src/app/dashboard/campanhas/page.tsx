"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs } from "@/components/ui/tabs";
import { FilterBar } from "@/components/layout/FilterBar";
import { CampaignTable } from "@/components/campaigns/CampaignTable";
import { BulkActionsBar } from "@/components/campaigns/BulkActionsBar";
import { CreateCampaignModal } from "@/components/campaigns/CreateCampaignModal";
import { sanitizeInput } from "@/lib/sanitization";

// Force dynamic rendering (não fazer SSG)
export const dynamic = "force-dynamic";

// Campaign type
interface Campaign {
  id: string;
  title: string;
  status: string;
  tipo: string;
  createdAt: string;
  termos: string;
  locais: string;
  creditsCost?: number;
  creditsRefunded?: number;
  leadsRequested?: number;
  processStartedAt?: string;
  estimatedCompletionTime?: number;
  timeoutAt?: string;
  isArchived?: boolean;
  _count?: {
    leads: number;
  };
}

type TabType = "all" | "active" | "paused" | "completed" | "archived";

export default function CampanhasPage() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch campaigns (incluir arquivadas para permitir filtro por tab)
  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns?includeArchived=true");
      if (!res.ok) throw new Error("Erro ao buscar campanhas");
      const data = await res.json();
      return data.campaigns || [];
    },
    refetchInterval: 30000, // Refetch a cada 30s (auto-refresh)
    refetchIntervalInBackground: true, // Continuar refetch mesmo em background
    staleTime: 0, // Dados sempre considerados stale (força refetch)
    refetchOnWindowFocus: true, // Refetch ao voltar para a janela
  });

  // Filter logic
  const filteredCampaigns = useMemo(() => {
    let filtered = [...campaigns];

    // Tab filter
    if (activeTab === "archived") {
      // Apenas arquivadas
      filtered = filtered.filter((c) => c.isArchived === true);
    } else {
      // Excluir arquivadas em todas as outras tabs
      filtered = filtered.filter((c) => !c.isArchived);

      if (activeTab === "active") {
        filtered = filtered.filter((c) => c.status === "PROCESSING");
      } else if (activeTab === "paused") {
        filtered = filtered.filter((c) => c.status === "PAUSED");
      } else if (activeTab === "completed") {
        filtered = filtered.filter(
          (c) => c.status === "COMPLETED" || c.status === "EXTRACTION_COMPLETED" || c.status === "FAILED"
        );
      }
    }

    // Search filter (title, termos, locais) - com sanitização
    if (searchQuery.trim()) {
      const sanitizedQuery = sanitizeInput(searchQuery.toLowerCase());
      filtered = filtered.filter(
        (c) =>
          sanitizeInput(c.title.toLowerCase()).includes(sanitizedQuery) ||
          sanitizeInput(c.termos?.toLowerCase() || '').includes(sanitizedQuery) ||
          sanitizeInput(c.locais?.toLowerCase() || '').includes(sanitizedQuery)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((c) => c.tipo === typeFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: unknown = a[sortColumn as keyof Campaign];
      let bValue: unknown = b[sortColumn as keyof Campaign];

      // Handle nested _count.leads
      if (sortColumn === "leads") {
        aValue = a._count?.leads || 0;
        bValue = b._count?.leads || 0;
      }

      // Convert to comparable values
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return filtered;
  }, [campaigns, activeTab, searchQuery, statusFilter, typeFilter, sortColumn, sortDirection]);

  // Count by status (excluindo arquivadas, exceto na tab "archived")
  const counts = useMemo(
    () => {
      const notArchived = campaigns.filter((c) => !c.isArchived);
      return {
        all: notArchived.length,
        active: notArchived.filter((c) => c.status === "PROCESSING").length,
        paused: notArchived.filter((c) => c.status === "PAUSED").length,
        completed: notArchived.filter(
          (c) => c.status === "COMPLETED" || c.status === "EXTRACTION_COMPLETED" || c.status === "FAILED"
        ).length,
        archived: campaigns.filter((c) => c.isArchived === true).length,
      };
    },
    [campaigns]
  );

  // Sort handler (com whitelist de colunas permitidas)
  const handleSort = (column: string) => {
    // Whitelist de colunas permitidas para ordenação (previne injection)
    const allowedColumns = ["title", "status", "tipo", "creditsCost", "createdAt"];

    if (!allowedColumns.includes(column)) {
      console.warn(`Tentativa de ordenar por coluna não permitida: ${column}`);
      return;
    }

    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to desc
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Campanhas</h1>
          <p className="text-muted-foreground">Gerencie suas campanhas de prospecção</p>
        </div>

        <CreateCampaignModal />
      </div>

      {/* Tabs (Meta Ads style) */}
      <Tabs
        tabs={[
          { label: "Todas", value: "all", count: counts.all },
          { label: "Ativas", value: "active", count: counts.active },
          { label: "Pausadas", value: "paused", count: counts.paused },
          { label: "Concluídas", value: "completed", count: counts.completed },
          { label: "Arquivadas", value: "archived", count: counts.archived },
        ]}
        activeTab={activeTab}
        onChange={(value) => setActiveTab(value as TabType)}
        variant="underline"
        className="mb-6"
      />

      {/* Filtros */}
      <FilterBar
        searchPlaceholder="Buscar por nome, tipo de negócio ou localização..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            label: "Status",
            placeholder: "Todos os status",
            options: [
              { label: "Em Processamento", value: "PROCESSING" },
              { label: "Extração Concluída", value: "EXTRACTION_COMPLETED" },
              { label: "Concluída", value: "COMPLETED" },
              { label: "Falhou", value: "FAILED" },
              { label: "Pausada", value: "PAUSED" },
            ],
            value: statusFilter,
            onChange: setStatusFilter,
          },
          {
            label: "Tipo de Campanha",
            placeholder: "Todos",
            options: [
              { label: "Básico", value: "BASICO" },
              { label: "Completo", value: "COMPLETO" },
              { label: "Envio", value: "ENVIO" },
            ],
            value: typeFilter,
            onChange: setTypeFilter,
          },
        ]}
        className="mb-6"
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedIds={selectedIds}
        selectedCampaigns={filteredCampaigns.filter(c => selectedIds.includes(c.id))}
        onClearSelection={() => setSelectedIds([])}
        isArchiveView={activeTab === "archived"}
      />

      {/* Campaign Table */}
      <CampaignTable
        campaigns={filteredCampaigns}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onSort={handleSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
      />

      {/* Info adicional */}
      {!isLoading && filteredCampaigns.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Mostrando {filteredCampaigns.length} de {campaigns.length} campanha(s)
        </div>
      )}
    </div>
  );
}
