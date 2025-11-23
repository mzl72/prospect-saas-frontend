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

  // Criar usuário admin
  const hashedPassword = await bcrypt.hash("admin123", 10);

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
  console.log(`   Senha: admin123`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   Créditos: ${admin.credits}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
