import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-900">
      <Sidebar />
      <main className="ml-64 min-h-screen">{children}</main>
    </div>
  );
}
