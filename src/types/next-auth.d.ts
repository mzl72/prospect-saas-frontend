import { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      tokenVersion: number;
      tenancyId: string | null;
      tenancyName: string | null;
      credits: number;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    tokenVersion: number;
    tenancyId: string | null;
    tenancyName: string | null;
    credits: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: string;
    tokenVersion: number;
    tenancyId: string | null;
    tenancyName: string | null;
    credits: number;
  }
}
