import React from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  FolderOpen,
  Cpu,
  Settings,
  LogOut,
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import { useAuthStore } from "../store/store";

const Sidebar = ({ activePage }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleLogout = () => {
    localStorage.removeItem("ll_token");
    localStorage.removeItem("ll_user");
    useAuthStore.getState().logout();
    toast.success("Signed out");
    navigate("/login");
  };

  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { id: "datasets", label: "Datasets", icon: FolderOpen, path: "/datasets" },
    { id: "deployments", label: "Deployments", icon: Cpu, path: "/deployments" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-white/5 flex flex-col h-full z-10 shrink-0">
      <div className="flex-1 p-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="cursor-pointer"
            onClick={() => navigate("/")}
            title="Home"
          >
            <BrandLogo textSize="text-xl" />
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <a
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-mono cursor-pointer transition-all ${
                  isActive
                    ? "text-cyan bg-cyan/10 hover:bg-cyan/15"
                    : "text-dim hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-white/5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet/20 border border-violet/30 flex items-center justify-center text-violet font-bold font-heading">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-white truncate">
              {displayName}
            </span>
            <span className="text-xs text-dim truncate">
              {user?.email || "user@example.com"}
            </span>
          </div>
        </div>
        <button
          className="w-full py-2 flex items-center justify-center gap-2 text-sm text-dim hover:text-acid hover:bg-acid/10 rounded-xl transition-all font-mono"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
