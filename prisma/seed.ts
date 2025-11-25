import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // Verificar se já existe usuário admin
  let admin = await prisma.user.findUnique({
    where: { email: "admin@prospect.com" },
  });

  if (admin) {
    console.log("✅ Usuário admin já existe");
  } else {
    // SECURITY (OWASP A07:2025): Senha obrigatória via .env
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;

    if (!adminPassword) {
      console.error("❌ ERRO: ADMIN_INITIAL_PASSWORD não definida no .env");
      console.error("   Adicione ao .env: ADMIN_INITIAL_PASSWORD=SuaSenhaSegura123!");
      process.exit(1);
    }

    // Bcrypt rounds: 14 (recomendação OWASP 2025 para alta segurança)
    const hashedPassword = await bcrypt.hash(adminPassword, 14);

    admin = await prisma.user.create({
      data: {
        email: "admin@prospect.com",
        name: "Administrador",
        password: hashedPassword,
        role: "ADMIN",
        credits: 1000,
        tenancyId: "default",
        tenancyName: "Prospect SaaS",
      },
    });

    console.log("✅ Usuário admin criado:");
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Créditos: ${admin.credits}`);
    console.log("   Senha: [Definida via ADMIN_INITIAL_PASSWORD - altere no primeiro login]");
  }

  // Criar templates padrão apenas se não existirem
  const existingTemplates = await prisma.template.count({
    where: { isDefault: true },
  });

  if (existingTemplates > 0) {
    console.log(`\n✅ Templates padrão já existem (${existingTemplates} encontrados)`);
  } else {
    console.log("\n🌱 Criando templates padrão...");

    const defaultTemplates = [
      {
        type: "EMAIL" as const,
        name: "Primeiro Contato - Apresentação",
        subject: "Oportunidade para {nomeEmpresa}",
        content: `Olá, equipe da {nomeEmpresa}!

Meu nome é {nomeVendedor} e represento a {nossaEmpresa}.

Notei que vocês atuam em {categoria} e gostaria de apresentar uma solução que pode ajudar a {beneficio}.

Podemos agendar uma conversa de 15 minutos?

Atenciosamente,
{nomeVendedor}
{cargoVendedor}
{telefoneVendedor}`,
        variables: ["nomeEmpresa", "nomeVendedor", "nossaEmpresa", "categoria", "beneficio", "cargoVendedor", "telefoneVendedor"],
        isDefault: true,
      },
      {
        type: "WHATSAPP" as const,
        name: "WhatsApp - Primeira Mensagem",
        subject: null,
        content: `Olá! 👋

Sou {nomeVendedor} da {nossaEmpresa}.

Vi que a {nomeEmpresa} atua em {categoria} e acredito que nossa solução pode agregar valor ao negócio de vocês.

Posso te enviar mais informações?`,
        variables: ["nomeVendedor", "nossaEmpresa", "nomeEmpresa", "categoria"],
        isDefault: true,
      },
      {
        type: "PROMPT_IA" as const,
        name: "Prompt de Enriquecimento - Análise Completa",
        subject: null,
        content: `Analise a empresa {nomeEmpresa} que atua em {categoria} localizada em {endereco}.

Website: {website}
Redes sociais: {redesSociais}

Forneça:
1. Pesquisa sobre a empresa (histórico, produtos/serviços, mercado)
2. Análise estratégica (dores potenciais, oportunidades)
3. Personalização (como nossa solução {nossaSolucao} pode ajudá-los)

Formato: JSON com campos companyResearch, strategicAnalysis, personalization`,
        variables: ["nomeEmpresa", "categoria", "endereco", "website", "redesSociais", "nossaSolucao"],
        isDefault: true,
      },
    ];

    for (const template of defaultTemplates) {
      await prisma.template.create({
        data: {
          type: template.type,
          name: template.name,
          subject: template.subject,
          content: template.content,
          variables: template.variables,
          isDefault: template.isDefault,
          createdBy: admin.id,
        },
      });
    }

    console.log(`✅ ${defaultTemplates.length} templates padrão criados`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
