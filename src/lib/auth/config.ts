import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma-db";
import bcrypt from "bcryptjs";
import type { Adapter } from "next-auth/adapters";
import { checkLoginRateLimit, resetLoginAttempts } from "./rate-limit";
import { securityLog } from "@/lib/logger";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email e senha são obrigatórios");
        }

        // Rate limiting para brute force protection
        const rateLimitResult = checkLoginRateLimit(credentials.email);
        if (!rateLimitResult.allowed) {
          const minutesLeft = Math.ceil((rateLimitResult.resetTime - Date.now()) / 60000);
          securityLog.bruteForceBlocked(credentials.email);
          throw new Error(`Muitas tentativas de login. Tente novamente em ${minutesLeft} minutos.`);
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            tenancyId: true,
            tenancyName: true,
            credits: true,
            tokenVersion: true,
          },
        });

        if (!user || !user.password) {
          securityLog.loginFailed(credentials.email, "User not found or no password");
          throw new Error("Credenciais inválidas");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          securityLog.loginFailed(credentials.email, "Invalid password");
          throw new Error("Credenciais inválidas");
        }

        // Login bem-sucedido - resetar contador de tentativas
        resetLoginAttempts(credentials.email);
        securityLog.loginSuccess(user.id, user.email);

        // Retornar user sem password
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role?.toString() || "OPERATOR",
          tenancyId: user.tenancyId,
          tenancyName: user.tenancyName,
          credits: user.credits,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenancyId = user.tenancyId;
        token.tenancyName = user.tenancyName;
        token.credits = user.credits;
        token.tokenVersion = user.tokenVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tokenVersion = token.tokenVersion as number;
        session.user.tenancyId = token.tenancyId as string | null;
        session.user.tenancyName = token.tenancyName as string | null;
        session.user.credits = token.credits as number;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
