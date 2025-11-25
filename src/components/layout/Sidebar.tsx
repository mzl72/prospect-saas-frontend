"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Coins,
  FileText,
  Settings,
} from "lucide-react";
import { useCredits } from "@/hooks/useCredits";

export function Sidebar() {
  const pathname = usePathname();
  const { data: credits = 0 } = useCredits();

  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    if (path === "/dashboard/campanhas" && pathname.startsWith("/dashboard/campanhas")) return true;
    if (path === "/dashboard/templates" && pathname.startsWith("/dashboard/templates")) return true;
    if (path === "/dashboard/configuracoes" && pathname.startsWith("/dashboard/configuracoes")) return true;
    return false;
  };

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/campanhas", label: "Campanhas", icon: Target },
    { href: "/dashboard/templates", label: "Templates", icon: FileText },
    { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
  ];

  // SECURITY (OWASP A05:2025): Sanitizar e validar créditos antes de exibir
  const sanitizedCredits = typeof credits === "number" && isFinite(credits)
    ? Math.max(0, Math.floor(credits))
    : 0;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <Link href="/" className="text-xl font-bold text-gray-800">
          Prospect SaaS
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-0.5 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                    active
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? "text-blue-600" : "text-gray-400"}`} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Credits Footer */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-md border border-green-100">
          <Coins className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <div className="text-xs text-gray-500">Créditos</div>
            {/* SECURITY: Usar valor sanitizado */}
            <div className="text-sm font-semibold text-green-700">{sanitizedCredits.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
