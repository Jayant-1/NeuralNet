import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Clock,
  Layers,
  LineChart,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  Workflow,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import ProjectWizard from "../components/Project/ProjectWizard";
import Sidebar from "../components/Sidebar";
import { deploymentApi, projectsApi } from "../services/api";
import { useAuthStore, useProjectStore } from "../store/store";
import { TEMPLATES } from "../utils/templates";

const TEMPLATE_ICONS = { mlp: Layers, cnn: Workflow, rnn: Sparkles };

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { projects, setProjects, addProject, deleteProject } =
    useProjectStore();
  const [showModal, setShowModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [deployments, setDeployments] = useState([]);

  useEffect(() => {
    loadProjects();
    loadDeployments();
  }, []);

  const loadProjects = async () => {
    try {
      const { data } = await projectsApi.list();
      if (data) setProjects(data);
    } catch {
      console.log("Using local projects cache");
    }
  };

  const loadDeployments = async () => {
    try {
      const { data } = await deploymentApi.list();
      setDeployments(data || []);
    } catch {
      setDeployments([]);
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

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const activeDeployments = deployments.filter((d) => d.is_active).length;
  const totalLayers = projects.reduce(
    (count, p) => count + (p.graph_data?.nodes?.length || 0),
    0,
  );

  const recentProjects = [...projects]
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime(),
    )
    .slice(0, 4);

  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="flex h-screen w-full bg-[#0B0B0F] overflow-hidden">
      {/* Sidebar */}
      <Sidebar activePage="dashboard" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan/5 via-[#0B0B0F] to-[#0B0B0F]">
        <div className="grain-overlay" />

        <div className="max-w-6xl w-full mx-auto p-8 lg:p-12 z-10">
          {/* Header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 animate-fade-in-up">
            <div className="lg:col-span-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-cyan/70 mb-4">
                Mission Control
              </p>
              <h1 className="text-4xl lg:text-6xl font-heading font-bold text-white leading-[0.92] tracking-tight">
                Model Operations,
                <br />
                <span className="gradient-text">at editorial speed.</span>
              </h1>
              <p className="text-zinc-300 text-sm md:text-zinc-400 mt-5 max-w-2xl font-mono leading-relaxed">
                {displayName}, this is your live command center. Start a new
                build, reopen active architecture, and monitor deployment
                readiness from one surface.
              </p>
            </div>

            <div className="lg:col-span-4 flex lg:justify-end items-start">
              <button
                className="px-5 py-2.5 rounded-xl bg-cyan/10 text-cyan border border-cyan/30 hover:bg-cyan/20 transition-all font-mono text-sm flex items-center gap-2"
                onClick={() => setShowModal(true)}
              >
                <Plus size={18} />
                Start New Build
              </button>
            </div>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in-up"
            style={{ animationDelay: "0.02s" }}
          >
            <div className="glass-panel rounded-2xl border border-white/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">
                  Projects
                </span>
                <Target size={16} className="text-cyan" />
              </div>
              <p className="text-3xl font-heading font-bold text-white">
                {projects.length}
              </p>
              <p className="text-xs text-dim mt-1 font-mono">
                Design archives in workspace
              </p>
            </div>

            <div className="glass-panel rounded-2xl border border-white/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">
                  Active Endpoints
                </span>
                <Activity size={16} className="text-acid" />
              </div>
              <p className="text-3xl font-heading font-bold text-white">
                {activeDeployments}
              </p>
              <p className="text-xs text-dim mt-1 font-mono">
                Live deployment surfaces
              </p>
            </div>

            <div className="glass-panel rounded-2xl border border-white/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">
                  Layer Inventory
                </span>
                <LineChart size={16} className="text-violet" />
              </div>
              <p className="text-3xl font-heading font-bold text-white">
                {totalLayers}
              </p>
              <p className="text-xs text-dim mt-1 font-mono">
                Nodes across all graphs
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
            <div
              className="lg:col-span-8 glass-panel rounded-2xl border border-white/10 p-6 animate-fade-in-up"
              style={{ animationDelay: "0.06s" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-heading font-bold text-white">
                    Continue Editing
                  </h2>
                  <p className="text-sm text-dim font-mono mt-1">
                    Most recently touched projects
                  </p>
                </div>
                <button
                  className="text-xs font-mono text-cyan hover:text-white transition-colors uppercase tracking-widest"
                  onClick={() => navigate("/deployments")}
                >
                  Deployment View
                </button>
              </div>

              <div className="space-y-3">
                {recentProjects.length > 0 ? (
                  recentProjects.map((project) => {
                    const nodeCount = project.graph_data?.nodes?.length || 0;
                    return (
                      <button
                        key={project.id}
                        className="w-full p-4 rounded-xl bg-[#0E0E15] border border-white/5 hover:border-cyan/30 transition-all text-left"
                        onClick={() => navigate(`/project/${project.id}`)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-white font-semibold">
                              {project.name}
                            </p>
                            <p className="text-xs text-dim font-mono mt-1">
                              Updated{" "}
                              {new Date(
                                project.updated_at || project.created_at,
                              ).toLocaleDateString()}{" "}
                              • {nodeCount} layers
                            </p>
                          </div>
                          <ArrowUpRight size={16} className="text-cyan" />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-white/10 text-center">
                    <p className="text-sm text-dim font-mono">
                      No projects yet. Start your first architecture draft.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div
              className="lg:col-span-4 glass-panel rounded-2xl border border-white/10 p-6 animate-fade-in-up"
              style={{ animationDelay: "0.08s" }}
            >
              <h3 className="text-lg font-heading font-bold text-white">
                Studio Checklist
              </h3>
              <p className="text-xs text-dim font-mono mt-1 mb-4">
                High-velocity handoff flow
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#0E0E15] border border-white/5">
                  <p className="text-xs font-mono uppercase tracking-wider text-cyan">
                    1. Build topology
                  </p>
                  <p className="text-sm text-dim mt-1">
                    Assemble layers and validate graph integrity.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#0E0E15] border border-white/5">
                  <p className="text-xs font-mono uppercase tracking-wider text-violet">
                    2. Run training
                  </p>
                  <p className="text-sm text-dim mt-1">
                    Observe curves and compare run behavior.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#0E0E15] border border-white/5">
                  <p className="text-xs font-mono uppercase tracking-wider text-acid">
                    3. Publish endpoint
                  </p>
                  <p className="text-sm text-dim mt-1">
                    Generate API key and ship inference access.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            className="flex flex-col md:flex-row md:items-end justify-between mb-6 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="mb-6 md:mb-0">
              <h2 className="text-2xl font-heading font-bold text-white mb-2">
                Project Archive
              </h2>
              <p className="text-dim text-sm font-mono">
                Search, reopen, or retire architecture drafts.
              </p>
            </div>
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
              placeholder="Find by project title..."
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
                      <span>Resume in workspace</span>
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
                No architectures yet
              </h3>
              <p className="text-dim text-sm mb-8 max-w-md">
                Start with a blank graph or template and build your first model
                narrative.
              </p>
              <button
                className="px-6 py-3 rounded-xl bg-cyan/10 text-cyan border border-cyan/30 hover:bg-cyan/20 hover:shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all font-mono text-sm flex items-center gap-2"
                onClick={() => setShowModal(true)}
              >
                <Plus size={18} />
                Start First Build
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
