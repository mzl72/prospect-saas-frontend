"use client";

import { Sidebar } from "./Sidebar";
import { usePathname } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();

  // Landing page (/) não tem sidebar
  const isLandingPage = pathname === "/";

  return (
    <div className="min-h-screen bg-gray-50">
      {!isLandingPage && <Sidebar />}
      <main className={!isLandingPage ? "ml-64" : ""}>{children}</main>
    </div>
  );
}
