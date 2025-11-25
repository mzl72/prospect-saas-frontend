"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sanitizeForDisplay } from "@/lib/sanitization";

// Campaign type
interface Campaign {
  id: string;
  title: string;
  status: string;
  tipo: string;
  createdAt: string;
  creditsCost?: number;
  creditsRefunded?: number;
  leadsRequested?: number;
  processStartedAt?: string;
  estimatedCompletionTime?: number;
  timeoutAt?: string;
  _count?: {
    leads: number;
  };
}

interface CampaignTableProps {
  campaigns: Campaign[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onSort: (column: string) => void;
  sortColumn: string;
  sortDirection: "asc" | "desc";
}

// Status colors (Meta Ads style)
const statusColors: Record<string, string> = {
  PROCESSING: "bg-blue-100 text-blue-800 border-blue-200",
  EXTRACTION_COMPLETED: "bg-cyan-100 text-cyan-800 border-cyan-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  PAUSED: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusLabels: Record<string, string> = {
  PROCESSING: "Em Processamento",
  EXTRACTION_COMPLETED: "Extração Concluída",
  COMPLETED: "Concluída",
  FAILED: "Falhou",
  PAUSED: "Pausada",
};

export function CampaignTable({
  campaigns,
  isLoading,
  selectedIds,
  onSelectionChange,
  onSort,
  sortColumn,
  sortDirection,
}: CampaignTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Toggle row expansion
  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Select all toggle (com limite de 50 campanhas)
  const MAX_SELECTION = 50;

  const handleSelectAll = () => {
    if (selectedIds.length === campaigns.length) {
      onSelectionChange([]);
    } else {
      const toSelect = campaigns.slice(0, MAX_SELECTION).map((c) => c.id);
      if (campaigns.length > MAX_SELECTION) {
        alert(`Limite máximo de seleção: ${MAX_SELECTION} campanhas. Selecionando as primeiras ${MAX_SELECTION}.`);
      }
      onSelectionChange(toSelect);
    }
  };

  // Select individual (com limite de 50 campanhas)
  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      if (selectedIds.length >= MAX_SELECTION) {
        alert(`Limite máximo de seleção atingido: ${MAX_SELECTION} campanhas`);
        return;
      }
      onSelectionChange([...selectedIds, id]);
    }
  };

  // Calculate success rate
  const calculateSuccessRate = (campaign: Campaign) => {
    const leadsCreated = campaign._count?.leads || 0;
    const leadsRequested = campaign.leadsRequested || 0;
    if (leadsRequested === 0) return 0;
    return Math.round((leadsCreated / leadsRequested) * 100);
  };

  // Sort header
  const SortHeader = ({ column, label }: { column: string; label: string }) => (
    <button
      onClick={() => onSort(column)}
      className="flex items-center gap-2 hover:text-foreground transition-colors"
    >
      {label}
      {sortColumn === column ? (
        sortDirection === "asc" ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )
      ) : (
        <ArrowUpDown className="w-4 h-4 opacity-30" />
      )}
    </button>
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left py-4 px-4 font-medium text-muted-foreground w-12"></th>
                <th className="text-left py-4 px-4 font-medium text-muted-foreground">Nome</th>
                <th className="text-left py-4 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-4 px-4 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left py-4 px-4 font-medium text-muted-foreground">Resultados</th>
                <th className="text-left py-4 px-4 font-medium text-muted-foreground">Taxa</th>
                <th className="text-left py-4 px-4 font-medium text-muted-foreground">Gasto</th>
                <th className="text-left py-4 px-4 font-medium text-muted-foreground">Data</th>
                <th className="text-left py-4 px-4 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-4 px-4">
                    <div className="w-4 h-4 bg-muted animate-pulse rounded"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-48 h-4 bg-muted animate-pulse rounded"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-24 h-6 bg-muted animate-pulse rounded"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-16 h-4 bg-muted animate-pulse rounded"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-20 h-4 bg-muted animate-pulse rounded"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-12 h-4 bg-muted animate-pulse rounded"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-16 h-4 bg-muted animate-pulse rounded"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-24 h-4 bg-muted animate-pulse rounded"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-20 h-8 bg-muted animate-pulse rounded"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Empty state
  if (campaigns.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-border p-12 text-center">
        <p className="text-muted-foreground text-lg mb-2">Nenhuma campanha encontrada</p>
        <p className="text-muted-foreground text-sm">
          Ajuste os filtros ou crie uma nova campanha
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-border shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.length === campaigns.length && campaigns.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                <SortHeader column="title" label="Nome da Campanha" />
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                <SortHeader column="status" label="Status" />
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                <SortHeader column="tipo" label="Tipo" />
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Resultados
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">Taxa</th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                <SortHeader column="creditsCost" label="Gasto" />
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                <SortHeader column="createdAt" label="Data" />
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground w-32"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => {
              const isExpanded = expandedRows.has(campaign.id);
              const successRate = calculateSuccessRate(campaign);
              const leadsCreated = campaign._count?.leads || 0;
              const leadsRequested = campaign.leadsRequested || 0;

              return (
                <>
                  <tr
                    key={campaign.id}
                    className="border-b border-border hover:bg-muted/20 transition-colors"
                  >
                    {/* Checkbox */}
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(campaign.id)}
                        onChange={() => handleSelectOne(campaign.id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>

                    {/* Nome */}
                    <td className="py-4 px-4">
                      <Link
                        href={`/dashboard/campanhas/${campaign.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                        dangerouslySetInnerHTML={{ __html: sanitizeForDisplay(campaign.title) }}
                      />
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <Badge className={`${statusColors[campaign.status]} border`}>
                        {statusLabels[campaign.status]}
                      </Badge>
                    </td>

                    {/* Tipo */}
                    <td className="py-4 px-4">
                      <span className="text-sm text-muted-foreground">
                        {campaign.tipo === "BASICO" ? "Básico" : "Completo"}
                      </span>
                    </td>

                    {/* Resultados */}
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-foreground">
                        {leadsCreated}/{leadsRequested}
                      </span>
                    </td>

                    {/* Taxa */}
                    <td className="py-4 px-4">
                      <span
                        className={`text-sm font-medium ${
                          successRate >= 75
                            ? "text-green-600"
                            : successRate >= 50
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {successRate}%
                      </span>
                    </td>

                    {/* Gasto */}
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <div className="font-medium text-foreground">
                          {campaign.creditsCost || 0}
                        </div>
                        {(campaign.creditsRefunded ?? 0) > 0 && (
                          <div className="text-xs text-green-600">
                            +{campaign.creditsRefunded} reemb.
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Data */}
                    <td className="py-4 px-4">
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(campaign.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRowExpansion(campaign.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4 mr-1" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-1" />
                            Detalhes
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>

                  {/* Expanded Row - Métricas Inline */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="bg-muted/10 p-6 border-b border-border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Resultados */}
                          <div>
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                              📊 Resultados
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Leads solicitados:
                                </span>
                                <span className="font-medium text-foreground">
                                  {leadsRequested}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Leads criados:</span>
                                <span className="font-medium text-foreground">
                                  {leadsCreated}
                                </span>
                              </div>
                              {campaign.creditsRefunded && campaign.creditsRefunded > 0 && (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Duplicatas:</span>
                                    <span className="font-medium text-foreground">
                                      {Math.floor(campaign.creditsRefunded / 0.25)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Créditos reembolsados:
                                    </span>
                                    <span className="font-medium text-green-600">
                                      +{campaign.creditsRefunded}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Tempo */}
                          <div>
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                              ⏱️ Tempo
                            </h4>
                            <div className="space-y-2 text-sm">
                              {campaign.processStartedAt && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Iniciado:</span>
                                  <span className="font-medium text-foreground">
                                    {formatDistanceToNow(new Date(campaign.processStartedAt), {
                                      addSuffix: true,
                                      locale: ptBR,
                                    })}
                                  </span>
                                </div>
                              )}
                              {campaign.estimatedCompletionTime && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Tempo estimado:
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {Math.floor(campaign.estimatedCompletionTime / 60)}min
                                  </span>
                                </div>
                              )}
                              {campaign.timeoutAt && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Timeout em:</span>
                                  <span className="font-medium text-foreground">
                                    {formatDistanceToNow(new Date(campaign.timeoutAt), {
                                      locale: ptBR,
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
