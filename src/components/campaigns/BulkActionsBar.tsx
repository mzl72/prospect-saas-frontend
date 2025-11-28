"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play, Archive, X, Download, Trash2, ArchiveRestore } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { sanitizeForDisplay } from "@/lib/sanitization";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Campaign {
  id: string;
  tipo: string;
  status: string;
  isArchived?: boolean;
}

interface BulkActionsBarProps {
  selectedIds: string[];
  selectedCampaigns: Campaign[];
  onClearSelection: () => void;
  isArchiveView?: boolean;
}

export function BulkActionsBar({
  selectedIds,
  selectedCampaigns,
  onClearSelection,
  isArchiveView = false
}: BulkActionsBarProps) {
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    variant?: "default" | "destructive";
  }>({
    open: false,
    title: "",
    description: "",
    action: () => {},
  });

  const bulkMutation = useMutation({
    mutationFn: async ({
      action,
      ids,
    }: {
      action: "pause" | "resume" | "archive" | "delete" | "unarchive";
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
        unarchive: "restauradas",
        delete: "excluídas permanentemente",
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
    setConfirmDialog({
      open: true,
      title: "Arquivar campanhas",
      description: `Tem certeza que deseja arquivar ${selectedIds.length} campanha(s)? Elas serão removidas da listagem principal.`,
      action: () => {
        bulkMutation.mutate({ action: "archive", ids: selectedIds });
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      open: true,
      title: "Excluir permanentemente",
      description: `⚠️ ATENÇÃO: Tem certeza que deseja EXCLUIR PERMANENTEMENTE ${selectedIds.length} campanha(s)? Todos os leads associados também serão deletados. Esta ação NÃO PODE ser desfeita!`,
      action: () => {
        bulkMutation.mutate({ action: "delete", ids: selectedIds });
        setConfirmDialog({ ...confirmDialog, open: false });
      },
      variant: "destructive",
    });
  };

  const handleUnarchive = () => {
    if (selectedIds.length === 0) return;
    bulkMutation.mutate({ action: "unarchive", ids: selectedIds });
  };

  const handleExport = () => {
    toast.info("Funcionalidade de exportação em desenvolvimento");
  };

  // Verificar se há campanhas ENVIO na seleção (para mostrar pause/resume)
  // NOTA: Por enquanto, ENVIO não existe no enum. Quando implementar, descomentar.
  // const hasEnvioCampaigns = selectedCampaigns.some(c => c.tipo === 'ENVIO');
  // const allAreEnvio = selectedCampaigns.every(c => c.tipo === 'ENVIO');

  // Por enquanto, como ENVIO não existe, verificamos que NÃO são BASICO/COMPLETO
  const allAreEnvio = selectedCampaigns.every(c => c.tipo !== 'BASICO' && c.tipo !== 'COMPLETO');

  if (selectedIds.length === 0) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-900">
          {selectedIds.length} campanha(s) selecionada(s)
        </span>

        <div className="flex items-center gap-2">
          {/* Pausar - Apenas para campanhas ENVIO */}
          {allAreEnvio && !isArchiveView && (
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
          )}

          {/* Retomar - Apenas para campanhas ENVIO */}
          {allAreEnvio && !isArchiveView && (
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
          )}

          {/* Restaurar - Apenas em visualização de arquivadas */}
          {isArchiveView ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnarchive}
              disabled={bulkMutation.isPending}
              className="bg-white hover:bg-green-50 border-green-300 text-green-600 hover:text-green-700"
            >
              <ArchiveRestore className="w-4 h-4 mr-2" />
              Restaurar
            </Button>
          ) : (
            /* Arquivar */
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchive}
              disabled={bulkMutation.isPending}
              className="bg-white hover:bg-gray-50 border-gray-300 text-orange-600 hover:text-orange-700"
            >
              <Archive className="w-4 h-4 mr-2" />
              Arquivar
            </Button>
          )}

          {/* Deletar */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={bulkMutation.isPending}
            className="bg-white hover:bg-red-50 border-red-300 text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
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

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialog.action}
              className={confirmDialog.variant === "destructive" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
