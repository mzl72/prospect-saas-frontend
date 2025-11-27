"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { CreateTemplateDialog } from "@/components/templates/CreateTemplateDialog";
import { EditTemplateDialog } from "@/components/templates/EditTemplateDialog";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { TemplateDetailModal } from "@/components/templates/TemplateDetailModal";
import { useTemplates, type Template, type TemplateType } from "@/hooks/useTemplates";
import { Loader2 } from "lucide-react";

// Force dynamic rendering (prevent SSG with useSession)
export const dynamic = "force-dynamic";

type TabType = "all" | "email" | "whatsapp" | "prompt";

export default function TemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null);

  // SECURITY (A01): Access Control - apenas MANAGER+ acessa
  if (status === "unauthenticated" || session?.user?.role === "OPERATOR") {
    router.push("/dashboard");
    return null;
  }

  // Loading state durante autenticação
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <TemplatesPageContent
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      editingTemplate={editingTemplate}
      setEditingTemplate={setEditingTemplate}
      viewingTemplate={viewingTemplate}
      setViewingTemplate={setViewingTemplate}
    />
  );
}

function TemplatesPageContent({
  activeTab,
  setActiveTab,
  editingTemplate,
  setEditingTemplate,
  viewingTemplate,
  setViewingTemplate,
}: {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  editingTemplate: Template | null;
  setEditingTemplate: (template: Template | null) => void;
  viewingTemplate: Template | null;
  setViewingTemplate: (template: Template | null) => void;
}) {
  // Fetch templates
  const { data: templates = [], isLoading } = useTemplates();

  // Filter templates by tab
  const filteredTemplates = useMemo(() => {
    if (activeTab === "all") return templates;

    const typeMap: Record<TabType, TemplateType | null> = {
      all: null,
      email: "EMAIL",
      whatsapp: "WHATSAPP",
      prompt: "PROMPT_IA",
    };

    const filterType = typeMap[activeTab];
    return filterType ? templates.filter((t) => t.type === filterType) : templates;
  }, [templates, activeTab]);

  // Count templates by type
  const counts = useMemo(
    () => ({
      all: templates.length,
      email: templates.filter((t) => t.type === "EMAIL").length,
      whatsapp: templates.filter((t) => t.type === "WHATSAPP").length,
      prompt: templates.filter((t) => t.type === "PROMPT_IA").length,
    }),
    [templates]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Templates</h1>
          <p className="text-muted-foreground">
            Gerencie templates de email, WhatsApp e prompts de IA
          </p>
        </div>

        <CreateTemplateDialog />
      </div>

      {/* Tabs (Meta Ads style) */}
      <Tabs
        tabs={[
          { label: "Todos", value: "all", count: counts.all },
          { label: "Email", value: "email", count: counts.email },
          { label: "WhatsApp", value: "whatsapp", count: counts.whatsapp },
          { label: "Prompts IA", value: "prompt", count: counts.prompt },
        ]}
        activeTab={activeTab}
        onChange={(value) => setActiveTab(value as TabType)}
        variant="underline"
        className="mb-6"
      />

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground text-lg mb-2">
            {activeTab === "all"
              ? "Nenhum template encontrado"
              : `Nenhum template de ${activeTab === "email" ? "Email" : activeTab === "whatsapp" ? "WhatsApp" : "Prompt IA"} encontrado`}
          </p>
          <p className="text-muted-foreground text-sm">
            Crie seu primeiro template clicando em &quot;Novo Template&quot;
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onView={setViewingTemplate}
              onEdit={setEditingTemplate}
            />
          ))}
        </div>
      )}

      {/* Info adicional */}
      {!isLoading && filteredTemplates.length > 0 && (
        <div className="mt-6 text-sm text-muted-foreground text-center">
          Mostrando {filteredTemplates.length} de {templates.length} template(s)
        </div>
      )}

      {/* View Detail Modal */}
      <TemplateDetailModal
        template={viewingTemplate}
        isOpen={!!viewingTemplate}
        onClose={() => setViewingTemplate(null)}
        onEdit={setEditingTemplate}
      />

      {/* Edit Dialog */}
      <EditTemplateDialog
        template={editingTemplate}
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
      />
    </div>
  );
}
