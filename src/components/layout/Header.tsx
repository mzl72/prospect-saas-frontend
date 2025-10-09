"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function Header() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const { data: credits = 0 } = useQuery({
    queryKey: ["credits"],
    queryFn: async () => {
      const response = await fetch("/api/users/credits");
      const data = await response.json();
      return data.success ? data.credits : 0;
    },
  });

  const isActive = (path: string) => pathname === path;

  return (
    <header className="border-b bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
              Prospect SaaS
            </Link>
          </div>

          <nav className="hidden md:flex space-x-8">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/")
                  ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Início
            </Link>
            <Link
              href="/gerar"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/gerar")
                  ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Gerar Leads
            </Link>
            <Link
              href="/campanhas"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/campanhas")
                  ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Campanhas
            </Link>
            <Link
              href="/emails"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith("/emails")
                  ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Emails
            </Link>
            <Link
              href="/whatsapp"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith("/whatsapp")
                  ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              WhatsApp
            </Link>
            <Link
              href="/cadencia-hibrida"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/cadencia-hibrida")
                  ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Híbrido
            </Link>
            <Link
              href="/configuracoes"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/configuracoes")
                  ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Configurações
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Créditos:{" "}
              <span className="font-semibold text-green-600 dark:text-green-400">{credits}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-9 h-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
