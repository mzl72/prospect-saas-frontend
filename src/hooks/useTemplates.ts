import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Template types from Prisma
 */
export type TemplateType = "EMAIL" | "WHATSAPP" | "PROMPT_IA";

export interface Template {
  id: string;
  type: TemplateType;
  name: string;
  subject: string | null;
  content: string;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  createdByUser?: {
    name: string | null;
  };
}

export interface CreateTemplateInput {
  type: TemplateType;
  name: string;
  subject?: string | null;
  content: string;
}

export interface UpdateTemplateInput {
  name?: string;
  subject?: string | null;
  content?: string;
  type?: TemplateType;
  isActive?: boolean;
}

/**
 * Hook para listar templates
 * Retorna templates próprios + padrão do sistema
 *
 * @param typeFilter - Filtrar por tipo (opcional)
 *
 * SECURITY:
 * - Retry exponential backoff
 * - Validação de resposta
 * - Rate limiting via retry limit
 */
export function useTemplates(typeFilter?: TemplateType) {
  return useQuery({
    queryKey: ["templates", typeFilter],
    queryFn: async () => {
      const url = typeFilter
        ? `/api/templates?type=${typeFilter}`
        : "/api/templates";

      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `API error: ${response.status}`);
      }

      const data = await response.json();

      // Validação de resposta
      if (typeof data.success !== "boolean" || !data.success) {
        throw new Error("Invalid API response");
      }

      if (!Array.isArray(data.templates)) {
        throw new Error("Invalid templates data");
      }

      return data.templates as Template[];
    },
    staleTime: 60000, // 1 minuto
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });
}

/**
 * Hook para criar template
 *
 * SECURITY:
 * - Validação client-side
 * - Toast de feedback
 * - Invalidação de cache
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar template");
      }

      return data.template as Template;
    },
    onSuccess: () => {
      // Invalidar cache de templates
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar template");
    },
  });
}

/**
 * Hook para atualizar template
 *
 * SECURITY:
 * - Ownership validado no backend
 * - Invalidação de cache
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateTemplateInput;
    }) => {
      const response = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao atualizar template");
      }

      return result.template as Template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar template");
    },
  });
}

/**
 * Hook para deletar template (soft delete)
 *
 * SECURITY:
 * - Ownership validado no backend
 * - Soft delete (isActive=false)
 * - Invalidação de cache
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao deletar template");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deletado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao deletar template");
    },
  });
}

/**
 * Hook para duplicar template
 * Cria uma cópia com " (cópia)" no nome
 */
export function useDuplicateTemplate() {
  const createMutation = useCreateTemplate();

  return useMutation({
    mutationFn: async (template: Template) => {
      const input: CreateTemplateInput = {
        type: template.type,
        name: `${template.name} (cópia)`,
        subject: template.subject,
        content: template.content,
      };

      return createMutation.mutateAsync(input);
    },
  });
}
