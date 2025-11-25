"use client";

import { Sidebar } from "./Sidebar";
import { usePathname } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();

  // Mostrar sidebar apenas em rotas /dashboard
  const showSidebar = pathname.startsWith("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      {showSidebar && <Sidebar />}
      <main className={showSidebar ? "ml-64" : ""}>{children}</main>
    </div>
  );
}
