// lib/demo-user.ts
// Gerenciamento centralizado do usuário demo
// TODO: Substituir por autenticação real (NextAuth.js)

import { prisma } from "@/lib/prisma-db";

// ID único e consistente para o usuário demo
export const DEMO_USER_ID = "user-demo-001";

// Dados padrão do usuário demo
const DEMO_USER_DATA = {
  id: DEMO_USER_ID,
  email: "demo@prospectsaas.com",
  name: "Usuário Demo",
  password: "demo123-placeholder", // Placeholder - não usado em prod com auth real
  credits: 150,
};

/**
 * Garante que o usuário demo existe no banco
 * Função centralizada para evitar inconsistências
 *
 * @returns User com id e credits
 */
export async function ensureDemoUser() {
  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    create: DEMO_USER_DATA,
    update: {}, // Não atualiza se já existir
    select: { id: true, credits: true, email: true, name: true },
  });

  return user;
}

/**
 * Obtém o ID do usuário atual
 * TODO: Quando implementar auth, retornar userId da sessão
 *
 * @returns userId string
 */
export function getCurrentUserId(): string {
  // TODO: const session = await getServerSession();
  // return session.user.id;
  return DEMO_USER_ID;
}
