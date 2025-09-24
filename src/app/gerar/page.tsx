import { LeadGenerationWizard } from "@/components/wizard/LeadGenerationWizard";

export default function GerarLeadsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gerar Lista de Leads
          </h1>
          <p className="text-gray-600 mt-2">
            Configure sua busca em 3 etapas simples
          </p>
        </div>

        <LeadGenerationWizard />
      </div>
    </div>
  );
}
