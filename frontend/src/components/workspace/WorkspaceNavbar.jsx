import {
  ArrowLeft,
  Download,
  Loader2,
  LogOut,
  Redo2,
  Save,
  Undo2,
  User,
} from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { projectsApi } from "../../services/api";
import {
  useAuthStore,
  useBuilderStore,
  useProjectStore,
} from "../../store/store";
import { generateKerasCode } from "../../utils/codeGenerator";
import BrandLogo from "../BrandLogo";

const Navbar = ({ projectName, onBack, activeTab }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("ll_token");
    localStorage.removeItem("ll_user");
    useAuthStore.getState().logout();
    toast.success("Signed out");
    navigate("/login");
  };

  const handleSave = async () => {
    const { activeProject } = useProjectStore.getState();
    const { nodes, edges } = useBuilderStore.getState();
    if (!activeProject) return;

    setSaving(true);
    try {
      const graphData = { nodes, edges };
      await projectsApi.update(activeProject.id, { graph_data: graphData });
      useProjectStore.getState().updateProject(activeProject.id, {
        graph_data: graphData,
        updated_at: new Date().toISOString(),
      });
      toast.success("Project saved!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const { nodes, edges } = useBuilderStore.getState();
    const code = generateKerasCode(nodes, edges);
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "model.py";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded model.py");
  };

  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <nav className="h-16 w-full flex items-center justify-between px-6 border-b border-white/5 bg-[#0B0B0F]/80 backdrop-blur-md shrink-0 z-50 relative">
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            className="p-2 -ml-2 text-dim hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center"
            onClick={onBack}
            title="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div
          className="cursor-pointer flex items-center"
          onClick={() => navigate("/")}
          title="Home"
        >
          <BrandLogo textSize="text-sm"   />
        </div>
        {projectName && (
          <>
            <div className="h-4 w-px bg-white/10 mx-2" />
            <span className="font-heading font-bold text-white tracking-wide truncate max-w-[200px] sm:max-w-xs">
              {projectName}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {activeTab === "builder" && (
          <>
            <div className="flex items-center gap-1">
              <button
                className="p-2 text-dim hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Undo"
              >
                <Undo2 size={16} />
              </button>
              <button
                className="p-2 text-dim hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Redo"
              >
                <Redo2 size={16} />
              </button>
            </div>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <button
              className="px-4 py-2 rounded-xl bg-cyan/10 text-cyan border border-cyan/30 hover:bg-cyan/20 transition-colors font-mono text-xs flex items-center gap-2"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              <span className="hidden sm:inline">Save</span>
            </button>
            <button
              className="px-4 py-2 rounded-xl border border-white/10 text-dim hover:text-white hover:bg-white/5 transition-colors font-mono text-xs flex items-center gap-2"
              onClick={handleExport}
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </>
        )}

        <div className="h-4 w-px bg-white/10 ml-2" />

        <div className="relative" ref={dropdownRef}>
          <div
            className="flex items-center gap-3 pl-2 group cursor-pointer"
            onClick={() => setShowDropdown(!showDropdown)}
            title="Profile menu"
          >
            <div className="w-8 h-8 rounded-full bg-violet/20 border border-violet/30 flex items-center justify-center text-violet font-bold font-heading text-sm group-hover:shadow-[0_0_10px_rgba(138,43,226,0.3)] transition-shadow">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>

          {showDropdown && (
            <div className="absolute right-0 mt-3 w-48 bg-[#1A1A28] border border-[#2A2A3A] rounded-2xl shadow-xl py-2 z-50 animate-fade-in-up">
              <div className="px-4 py-2 border-b border-white/5 mb-1">
                <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                <p className="text-xs text-dim truncate">{user?.email || "user@example.com"}</p>
              </div>
              <button
                className="w-full px-4 py-2 text-left text-sm text-dim hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                onClick={() => {
                  setShowDropdown(false);
                  navigate("/dashboard");
                }}
              >
                <User size={14} />
                Dashboard
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2 mt-1"
                onClick={handleLogout}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
