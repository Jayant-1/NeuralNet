import {
  Box,
  ChevronRight,
  Clock,
  Cpu,
  FolderOpen,
  GitBranch,
  Layers,
  LayoutDashboard,
  LogOut,
  Plus,
  ScanLine,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import ProjectWizard from "../components/Project/ProjectWizard";
import { projectsApi } from "../services/api";
import { useAuthStore, useProjectStore } from "../store/store";
import { TEMPLATES } from "../utils/templates";

const TEMPLATE_ICONS = { mlp: Layers, cnn: ScanLine, rnn: GitBranch };

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { projects, setProjects, addProject, deleteProject } =
    useProjectStore();
  const [showModal, setShowModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data } = await projectsApi.list();
      if (data) setProjects(data);
    } catch (err) {
      console.log("Using local projects");
    }
  };

  const handleCreateProject = async (wizardData) => {
    setLoading(true);
    const templateData = wizardData.template
      ? TEMPLATES[wizardData.template]
      : null;
    const projectData = {
      name: wizardData.name,
      description: wizardData.description,
      template: wizardData.template || "custom",
      problem_type: wizardData.problem_type || "custom",
      input_type: wizardData.input_type || "tabular",
      preprocessing_config: wizardData.preprocessing_config || {},
      graph_data: templateData
        ? { nodes: templateData.nodes, edges: templateData.edges }
        : { nodes: [], edges: [] },
    };
    try {
      const { data } = await projectsApi.create(projectData);
      addProject(data);
      toast.success("Project created!");
      navigate(`/project/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create project");
    }
    setShowModal(false);
    setLoading(false);
  };

  const handleDeleteProject = (project, e) => {
    e.stopPropagation();
    setProjectToDelete(project);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await projectsApi.delete(projectToDelete.id);
      deleteProject(projectToDelete.id);
      toast.success("Project deleted");
    } catch {
      toast.error("Failed to delete project");
    }
    setProjectToDelete(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("ll_token");
    localStorage.removeItem("ll_user");
    useAuthStore.getState().logout();
    toast.success("Signed out");
    navigate("/login");
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="flex h-screen w-full bg-[#0B0B0F] overflow-hidden">
      {/* Sidebar */}
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
            <a className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-mono text-cyan bg-cyan/10 hover:bg-cyan/15 cursor-pointer transition-all">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </a>
            <a className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-mono text-dim hover:text-white hover:bg-white/5 cursor-pointer transition-all">
              <FolderOpen size={18} />
              <span>Projects</span>
            </a>
            <a className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-mono text-dim hover:text-white hover:bg-white/5 cursor-pointer transition-all">
              <Cpu size={18} />
              <span>Models</span>
            </a>
            <a className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-mono text-dim hover:text-white hover:bg-white/5 cursor-pointer transition-all">
              <Settings size={18} />
              <span>Settings</span>
            </a>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan/5 via-[#0B0B0F] to-[#0B0B0F]">
        <div className="grain-overlay" />

        <div className="max-w-6xl w-full mx-auto p-8 lg:p-12 z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 animate-fade-in-up">
            <div className="mb-6 md:mb-0">
              <h1 className="text-3xl font-heading font-bold text-white mb-2">
                Welcome back,{" "}
                <span className="gradient-text">{displayName}</span>
              </h1>
              <p className="text-dim text-sm">
                Build, train, and deploy neural networks visually.
              </p>
            </div>
            <button
              className="px-5 py-2.5 rounded-xl bg-cyan/10 text-cyan border border-cyan/30 hover:bg-cyan/20 hover:shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all font-mono text-sm flex items-center gap-2"
              onClick={() => setShowModal(true)}
            >
              <Plus size={18} />
              New Project
            </button>
          </div>

          {/* Search */}
          <div
            className="relative mb-8 max-w-md text-dim animate-fade-in-up"
            style={{ animationDelay: "0.05s" }}
          >
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="Search projects..."
              className="w-full bg-[#1A1A28] border border-[#2A2A3A] rounded-xl pl-10 pr-4 py-3 text-sm text-[#E0E0E8] focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all font-mono placeholder:text-[#6B6B80]/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Project grid */}
          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project, idx) => {
                const Icon = TEMPLATE_ICONS[project.template] || Layers;
                const nodeCount = project.graph_data?.nodes?.length || 0;
                return (
                  <div
                    key={project.id}
                    className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-cyan/30 hover:shadow-[0_8px_32px_rgba(0,242,255,0.05)] transition-all duration-300 cursor-pointer group flex flex-col h-full animate-fade-in-up relative overflow-hidden"
                    style={{ animationDelay: `${0.05 * (idx + 1)}s` }}
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-cyan/50 transition-all duration-500"></div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-violet/10 border border-violet/20 text-violet flex items-center justify-center">
                        <Icon size={20} />
                      </div>
                      <button
                        className="p-2 text-dim hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleDeleteProject(project, e)}
                        title="Delete project"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <h3 className="text-lg font-bold font-heading text-white mb-2">
                      {project.name}
                    </h3>
                    <p className="text-sm text-dim mb-6 flex-1 line-clamp-2">
                      {project.description || "No description"}
                    </p>

                    <div className="flex items-center flex-wrap gap-3 mb-6">
                      <span className="px-2.5 py-1 rounded-md bg-cyan/10 text-cyan text-[10px] font-mono uppercase tracking-wider border border-cyan/20">
                        {project.template || "custom"}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-dim font-mono">
                        <Layers size={12} /> {nodeCount} layers
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-dim font-mono">
                        <Clock size={12} />{" "}
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-xs text-dim group-hover:text-cyan transition-colors font-mono">
                      <span>Open workspace</span>
                      <ChevronRight
                        size={14}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel border-dashed border-2 border-[#2A2A3A] rounded-3xl p-16 flex flex-col items-center justify-center text-center animate-fade-in-up">
              <div className="w-20 h-20 rounded-2xl bg-cyan/5 border border-cyan/10 text-cyan flex items-center justify-center mb-6">
                <Layers size={40} />
              </div>
              <h3 className="text-xl font-bold font-heading text-white mb-2">
                No projects yet
              </h3>
              <p className="text-dim text-sm mb-8 max-w-md">
                Create your first neural network project to get started with
                NeuralNet.
              </p>
              <button
                className="px-6 py-3 rounded-xl bg-cyan/10 text-cyan border border-cyan/30 hover:bg-cyan/20 hover:shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all font-mono text-sm flex items-center gap-2"
                onClick={() => setShowModal(true)}
              >
                <Plus size={18} />
                Create Project
              </button>
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <ProjectWizard
          onClose={() => setShowModal(false)}
          onCreate={handleCreateProject}
          loading={loading}
        />
      )}

      {projectToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in-up">
          <div
            className="glass-panel w-full max-w-md rounded-3xl border border-white/10 shadow-2xl p-6 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50"></div>
            <h3 className="text-xl font-bold font-heading text-white mb-2 flex items-center gap-2">
              <Trash2 className="text-red-400" size={20} /> Delete Project
            </h3>
            <p className="text-dim text-sm mb-6">
              Are you sure you want to delete{" "}
              <strong className="text-white">"{projectToDelete.name}"</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-xl text-dim hover:text-white hover:bg-white/5 transition-colors font-mono text-sm"
                onClick={() => setProjectToDelete(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors font-mono text-sm font-bold"
                onClick={confirmDeleteProject}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
