import { useState } from "react";
import { Outlet } from "react-router-dom";
import "../assets/css/dashboard.css";
import Navbar from "../components/header";
import Sidebar from "../components/menu";
import { useAuth } from "../auth/AuthContext";

export default function GerenteLayout() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        role={user?.role}
      />
      <div
        className={`main-content ${isOpen ? "sidebar-open" : "sidebar-closed"}`}
      >
        <Navbar
          toggleSidebar={() => setIsOpen(!isOpen)}
          user={user}
          onLogout={logout}
        />
        <div className="dash-container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
