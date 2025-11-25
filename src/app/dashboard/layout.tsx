"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // SECURITY: Breadcrumbs dinâmicos (evita XSS de pathname)
  const getBreadcrumbs = (): { label: string; href?: string }[] => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: { label: string; href?: string }[] = [
      { label: "Dashboard", href: "/dashboard" }
    ];

    if (segments[1] === "campanhas") {
      breadcrumbs.push({ label: "Campanhas" });
    } else if (segments[1] === "templates") {
      breadcrumbs.push({ label: "Templates" });
    } else if (segments[1] === "configuracoes") {
      breadcrumbs.push({ label: "Configurações" });
    }

    return breadcrumbs;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        <TopBar breadcrumbs={getBreadcrumbs()} />
        <main className="flex-1 bg-background">{children}</main>
      </div>
    </div>
  );
}
