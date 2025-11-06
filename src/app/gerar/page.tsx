import { LeadGenerationWizard } from "@/components/wizard/LeadGenerationWizard";
import { Layout } from "@/components/layout/Layout";

export default function GerarLeadsPage() {
  return (
    <Layout>
      <div className="py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">
              Gerar Lista de Leads
            </h1>
            <p className="text-gray-300 mt-2">
              Configure sua busca em 3 etapas simples
            </p>
          </div>

          <LeadGenerationWizard />
        </div>
      </div>
    </Layout>
  );
}
