"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Template } from "@/hooks/useTemplates";
import { useDeleteTemplate, useDuplicateTemplate } from "@/hooks/useTemplates";

interface TemplateCardProps {
  template: Template;
  onEdit?: (template: Template) => void;
}

// Type icons
const typeIcons = {
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  PROMPT_IA: Sparkles,
};

// Type colors
const typeColors = {
  EMAIL: "bg-blue-100 text-blue-800 border-blue-200",
  WHATSAPP: "bg-green-100 text-green-800 border-green-200",
  PROMPT_IA: "bg-purple-100 text-purple-800 border-purple-200",
};

// Type labels
const typeLabels = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  PROMPT_IA: "Prompt IA",
};

export function TemplateCard({ template, onEdit }: TemplateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteMutation = useDeleteTemplate();
  const duplicateMutation = useDuplicateTemplate();

  const Icon = typeIcons[template.type];

  // Truncate content para preview
  const contentPreview =
    template.content.length > 200
      ? `${template.content.substring(0, 200)}...`
      : template.content;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(template.id);
    setShowDeleteDialog(false);
  };

  const handleDuplicate = async () => {
    await duplicateMutation.mutateAsync(template);
  };

  return (
    <>
      <Card className="group hover:shadow-md transition-all duration-200 border border-border bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            {/* Icon + Type Badge */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`p-2 rounded-lg ${typeColors[template.type]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground line-clamp-1 mb-1">
                  {template.name}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${typeColors[template.type]} border text-xs`}>
                    {typeLabels[template.type]}
                  </Badge>
                  {template.isDefault && (
                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 bg-orange-50">
                      <Shield className="w-3 h-3 mr-1" />
                      Padrão
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!template.isDefault && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(template)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleDuplicate}
                  disabled={duplicateMutation.isPending}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {duplicateMutation.isPending ? "Duplicando..." : "Duplicar"}
                </DropdownMenuItem>
                {!template.isDefault && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
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

          {/* Subject (apenas para EMAIL) */}
          {template.type === "EMAIL" && template.subject && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">Assunto:</p>
              <p className="text-sm font-medium text-foreground line-clamp-1">
                {template.subject}
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent className="pb-3">
          {/* Content Preview */}
          <div className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4 bg-muted/30 p-3 rounded-md font-mono text-xs">
            {contentPreview}
          </div>

          {/* Variables */}
          {template.variables.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">
                Variáveis ({template.variables.length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {template.variables.slice(0, 5).map((variable) => (
                  <code
                    key={variable}
                    className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200"
                  >
                    {`{${variable}}`}
                  </code>
                ))}
                {template.variables.length > 5 && (
                  <span className="text-xs text-muted-foreground px-2 py-1">
                    +{template.variables.length - 5} mais
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-3 border-t border-border">
          <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <span>
              {template.createdByUser?.name || "Sistema"}
            </span>
            <span>
              {formatDistanceToNow(new Date(template.createdAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o template &quot;{template.name}&quot;?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
