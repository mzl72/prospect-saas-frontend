"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Target,
  LayoutList,
  Mail,
  MessageSquare,
  GitMerge,
  Settings,
  Coins,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const { data: credits = 0 } = useQuery({
    queryKey: ["credits"],
    queryFn: async () => {
      const response = await fetch("/api/users/credits");
      const data = await response.json();
      return data.success ? data.credits : 0;
    },
  });

  const isActive = (path: string) => {
    if (path === "/") return pathname === path;
    return pathname.startsWith(path);
  };

  const menuItems = [
    { href: "/", label: "Início", icon: Home },
    { href: "/gerar", label: "Gerar Leads", icon: Target },
    { href: "/campanhas", label: "Campanhas", icon: LayoutList },
    { href: "/emails", label: "Emails", icon: Mail },
    { href: "/whatsapp", label: "WhatsApp", icon: MessageSquare },
    { href: "/cadencia-hibrida", label: "Híbrido", icon: GitMerge },
    { href: "/configuracoes", label: "Configurações", icon: Settings },
  ];

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
            <div className="text-sm font-semibold text-green-700">{credits.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
