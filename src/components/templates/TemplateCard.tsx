"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Mail,
  MessageCircle,
  Sparkles,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Shield,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Template } from "@/hooks/useTemplates";
import { useDeleteTemplate, useDuplicateTemplate } from "@/hooks/useTemplates";

interface TemplateCardProps {
  template: Template;
  onEdit?: (template: Template) => void;
  onView?: (template: Template) => void;
}

// Type icons
const typeIcons = {
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  PROMPT_IA: Sparkles,
};

// Type colors (mais suaves para cards compactos)
const typeColors = {
  EMAIL: "bg-blue-50 text-blue-700 border-blue-200",
  WHATSAPP: "bg-green-50 text-green-700 border-green-200",
  PROMPT_IA: "bg-purple-50 text-purple-700 border-purple-200",
};

// Icon background colors
const iconBgColors = {
  EMAIL: "bg-blue-500",
  WHATSAPP: "bg-green-500",
  PROMPT_IA: "bg-purple-500",
};

// Type labels
const typeLabels = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  PROMPT_IA: "Prompt IA",
};

export function TemplateCard({ template, onEdit, onView }: TemplateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteMutation = useDeleteTemplate();
  const duplicateMutation = useDuplicateTemplate();

  const Icon = typeIcons[template.type];

  // Contar campos estruturados se existirem
  const fieldsCount = template.fields
    ? Object.keys(template.fields as Record<string, unknown>).length
    : 0;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(template.id);
    setShowDeleteDialog(false);
  };

  const handleDuplicate = async () => {
    await duplicateMutation.mutateAsync(template);
  };

  const handleCardClick = () => {
    if (onView) {
      onView(template);
    }
  };

  return (
    <>
      <Card
        onClick={handleCardClick}
        className="group hover:shadow-lg hover:border-blue-300 transition-all duration-200 border border-border bg-white cursor-pointer overflow-hidden"
      >
        {/* Header compacto */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            {/* Icon circular */}
            <div className={`p-2.5 rounded-full ${iconBgColors[template.type]} shadow-sm`}>
              <Icon className="w-5 h-5 text-white" />
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if (onView) onView(template); }}>
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(template); }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}
                  disabled={duplicateMutation.isPending}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {duplicateMutation.isPending ? "Duplicando..." : "Duplicar"}
                </DropdownMenuItem>
                {!template.isDefault && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Deletar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Nome do template */}
          <h3 className="font-semibold text-foreground line-clamp-2 mb-2 min-h-[2.5rem]">
            {template.name}
          </h3>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Badge className={`${typeColors[template.type]} border text-xs font-medium`}>
              {typeLabels[template.type]}
            </Badge>
            {template.isDefault && (
              <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 bg-orange-50 font-medium">
                <Shield className="w-3 h-3 mr-1" />
                Padrão
              </Badge>
            )}
          </div>

          {/* Informações resumidas */}
          <div className="space-y-2 text-xs text-muted-foreground">
            {fieldsCount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>{fieldsCount} campos estruturados</span>
              </div>
            )}
            {template.variables && template.variables.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span>{template.variables.length} variáveis</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span>Criado {formatDistanceToNow(new Date(template.createdAt), { addSuffix: true, locale: ptBR })}</span>
            </div>
          </div>
        </div>

        {/* Footer com gradient hover effect */}
        <div className="px-4 py-2 bg-muted/30 border-t border-border text-xs text-center text-muted-foreground group-hover:bg-blue-50 transition-colors">
          Clique para visualizar detalhes
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o template &quot;{template.name}&quot;?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
