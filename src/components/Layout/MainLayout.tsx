import { type ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useApp } from "../../context/AppContext";

export default function MainLayout({ children }: { children: ReactNode }) {
  const { sidebarOpen } = useApp();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div
        className={`min-w-0 flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "lg:mr-64" : "lg:mr-16"}`}
      >
        <Header />
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
