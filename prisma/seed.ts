import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // Verificar se já existe usuário admin
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@prospect.com" },
  });

  if (existingAdmin) {
    console.log("✅ Usuário admin já existe");
    return;
  }

  // SECURITY (OWASP A07:2025): Senha obrigatória via .env
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;

  if (!adminPassword) {
    console.error("❌ ERRO: ADMIN_INITIAL_PASSWORD não definida no .env");
    console.error("   Adicione ao .env: ADMIN_INITIAL_PASSWORD=SuaSenhaSegura123!");
    process.exit(1);
  }

  // Bcrypt rounds: 14 (recomendação OWASP 2025 para alta segurança)
  const hashedPassword = await bcrypt.hash(adminPassword, 14);

  const admin = await prisma.user.create({
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

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
