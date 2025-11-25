"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ChevronRight, LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface TopBarProps {
  breadcrumbs: Breadcrumb[];
}

/**
 * TopBar with breadcrumbs and user menu (Meta Ads style)
 *
 * @example
 * ```tsx
 * <TopBar
 *   breadcrumbs={[
 *     { label: "Dashboard", href: "/dashboard" },
 *     { label: "Campanhas" }
 *   ]}
 * />
 * ```
 */
export function TopBar({ breadcrumbs }: TopBarProps) {
  const { data: session } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // SECURITY: Sanitizar breadcrumbs (limitar tamanho)
  const sanitizedBreadcrumbs = breadcrumbs.map(b => ({
    ...b,
    label: b.label.substring(0, 100),
  }));

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm">
        {sanitizedBreadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <div key={index} className="flex items-center">
              {breadcrumb.href ? (
                <Link
                  href={breadcrumb.href}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {breadcrumb.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium">
                  {breadcrumb.label}
                </span>
              )}

              {!isLast && (
                <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
              )}
            </div>
          );
        })}
      </nav>

      {/* User Menu */}
      <Dialog open={showUserMenu} onOpenChange={setShowUserMenu}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-3 hover:bg-gray-50 px-3 py-2 rounded-md transition-colors">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {session?.user?.name || session?.user?.email || "Usuário"}
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {session?.user?.role?.toLowerCase() || "operator"}
              </div>
            </div>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {(session?.user?.name?.[0] || session?.user?.email?.[0] || "U").toUpperCase()}
            </div>
          </button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <div className="space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {(session?.user?.name?.[0] || session?.user?.email?.[0] || "U").toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {session?.user?.name || "Usuário"}
                </div>
                <div className="text-sm text-gray-500">
                  {session?.user?.email}
                </div>
                <div className="text-xs text-gray-400 capitalize mt-1">
                  Role: {session?.user?.role?.toLowerCase() || "operator"}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-2">
              <Link href="/dashboard/configuracoes">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="w-4 h-4 mr-3" />
                  Meu Perfil
                </Button>
              </Link>

              <Link href="/dashboard/configuracoes">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Configurações
                </Button>
              </Link>
            </div>

            {/* Logout */}
            <div className="pt-4 border-t border-gray-200">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sair
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
