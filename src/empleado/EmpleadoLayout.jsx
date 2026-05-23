import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/header";
import Sidebar from "../components/menu";
import { useAuth } from "../auth/AuthContext";

export default function EmpleadoLayout() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen overflow-hidden bg-bg">
      <Sidebar
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        role={user?.role}
      />
      <div
        className={`flex h-screen flex-1 flex-col overflow-y-auto transition-[margin] duration-200 max-md:ml-0 ${
          isOpen ? "ml-[230px]" : "ml-16"
        }`}
      >
        <Navbar
          toggleSidebar={() => setIsOpen(!isOpen)}
          user={user}
          onLogout={logout}
        />
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
