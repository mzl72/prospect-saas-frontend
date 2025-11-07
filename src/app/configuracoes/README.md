# Configurações - Dados da Empresa e Prompts IA

**page.tsx**: Página com 2 tabs (Empresa, Prompts IA). Tab Empresa: campos obrigatórios (nomeEmpresa, assinatura) e opcionais (telefone, website, descrição sobre empresa). Tab Prompts IA: prompts genéricos usados por todos canais (templatePesquisa, templateAnaliseEmpresa). Suporta navegação via hash (#company, #prompts). Usa React Query + mutations, atualiza cache diretamente ao invés de invalidar (setQueryData).
**loading.tsx**: Skeleton loading com Cards simulando formulários (títulos, campos, textareas)
