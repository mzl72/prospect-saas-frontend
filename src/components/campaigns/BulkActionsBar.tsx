"use client";

import { Button } from "@/components/ui/button";
import { Pause, Play, Archive, X, Download } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { sanitizeForDisplay } from "@/lib/sanitization";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export function BulkActionsBar({ selectedIds, onClearSelection }: BulkActionsBarProps) {
  const queryClient = useQueryClient();

  const bulkMutation = useMutation({
    mutationFn: async ({
      action,
      ids,
    }: {
      action: "pause" | "resume" | "archive";
      ids: string[];
    }) => {
      try {
        const response = await fetch("/api/campaigns/bulk", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, action }),
        });

        if (!response.ok) {
          // Tentar parsear erro do backend
          try {
            const error = await response.json();
            throw new Error(error.error || "Erro ao executar ação em massa");
          } catch {
            // Fallback se JSON parsing falhar
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
          }
        }

        return response.json();
      } catch (error) {
        // Tratar erros de rede (offline, timeout, etc)
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error("Erro de conexão. Verifique sua internet e tente novamente.");
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate campaigns query to refetch
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });

      const actionLabels = {
        pause: "pausadas",
        resume: "retomadas",
        archive: "arquivadas",
      };

      toast.success(
        `${selectedIds.length} campanha(s) ${actionLabels[variables.action]} com sucesso!`
      );

      onClearSelection();
    },
    onError: (error) => {
      // Log estruturado do erro (não expõe no toast)
      console.error("Erro em ação em massa:", {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // Sanitizar mensagem de erro antes de exibir ao usuário
      const errorMessage = error instanceof Error ? error.message : "Erro ao executar ação";
      const sanitizedMessage = sanitizeForDisplay(errorMessage);

      toast.error(sanitizedMessage);
    },
  });

  const handlePause = () => {
    if (selectedIds.length === 0) return;
    bulkMutation.mutate({ action: "pause", ids: selectedIds });
  };

  const handleResume = () => {
    if (selectedIds.length === 0) return;
    bulkMutation.mutate({ action: "resume", ids: selectedIds });
  };

  const handleArchive = () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Tem certeza que deseja arquivar ${selectedIds.length} campanha(s)? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    bulkMutation.mutate({ action: "archive", ids: selectedIds });
  };

  const handleExport = () => {
    toast.info("Funcionalidade de exportação em desenvolvimento");
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-900">
          {selectedIds.length} campanha(s) selecionada(s)
        </span>

        <div className="flex items-center gap-2">
          {/* Pausar */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePause}
            disabled={bulkMutation.isPending}
            className="bg-white hover:bg-gray-50 border-gray-300"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pausar
          </Button>

          {/* Retomar */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResume}
            disabled={bulkMutation.isPending}
            className="bg-white hover:bg-gray-50 border-gray-300"
          >
            <Play className="w-4 h-4 mr-2" />
            Retomar
          </Button>

          {/* Arquivar */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleArchive}
            disabled={bulkMutation.isPending}
            className="bg-white hover:bg-gray-50 border-gray-300 text-red-600 hover:text-red-700"
          >
            <Archive className="w-4 h-4 mr-2" />
            Arquivar
          </Button>

          {/* Exportar */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={bulkMutation.isPending}
            className="bg-white hover:bg-gray-50 border-gray-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>

          {/* Limpar Seleção */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={bulkMutation.isPending}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        </div>
      </div>

      {/* Loading indicator */}
      {bulkMutation.isPending && (
        <div className="absolute inset-0 bg-blue-50/80 flex items-center justify-center">
          <div className="flex items-center gap-2 text-blue-900 text-sm font-medium">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Processando...
          </div>
        </div>
      )}
    </div>
  );
}
