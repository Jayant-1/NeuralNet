import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useProjectStore } from '../store/store';
import { projectsApi } from '../services/api';
import { TEMPLATES } from '../utils/templates';
import ProjectWizard from '../components/Project/ProjectWizard';
import {
  Box, Plus, FolderOpen, LogOut, LayoutDashboard, Settings,
  Trash2, Clock, Layers, ScanLine, GitBranch, Cpu, Search,
  ChevronRight, Loader2, X, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import './DashboardPage.css';

const TEMPLATE_ICONS = { mlp: Layers, cnn: ScanLine, rnn: GitBranch };

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { projects, setProjects, addProject, deleteProject } = useProjectStore();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [newProject, setNewProject] = useState({ name: '', description: '', template: '' });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data } = await projectsApi.list();
      if (data) setProjects(data);
    } catch (err) {
      console.log('Using local projects');
    }
  };

  const handleCreateProject = async (wizardData) => {
    setLoading(true);
    const templateData = wizardData.template ? TEMPLATES[wizardData.template] : null;
    const projectData = {
      name: wizardData.name,
      description: wizardData.description,
      template: wizardData.template || 'custom',
      problem_type: wizardData.problem_type || 'custom',
      input_type: wizardData.input_type || 'tabular',
      preprocessing_config: wizardData.preprocessing_config || {},
      graph_data: templateData
        ? { nodes: templateData.nodes, edges: templateData.edges }
        : { nodes: [], edges: [] },
    };
    try {
      const { data } = await projectsApi.create(projectData);
      addProject(data);
      toast.success('Project created!');
      navigate(`/project/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create project');
    }
    setShowModal(false);
    setLoading(false);
  };

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    try {
      await projectsApi.delete(id);
    } catch {}
    deleteProject(id);
    toast.success('Project deleted');
  };

  const handleLogout = () => {
    localStorage.removeItem('ll_token');
    localStorage.removeItem('ll_user');
    useAuthStore.getState().logout();
    toast.success('Signed out');
    navigate('/login');
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-top">
          <div className="dash-logo">
            <div className="dash-logo-icon"><Box size={20} /></div>
            <span className="dash-logo-text">LayerLab</span>
          </div>

          <nav className="dash-nav">
            <a className="dash-nav-item active">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </a>
            <a className="dash-nav-item">
              <FolderOpen size={18} />
              <span>Projects</span>
            </a>
            <a className="dash-nav-item">
              <Cpu size={18} />
              <span>Models</span>
            </a>
            <a className="dash-nav-item">
              <Settings size={18} />
              <span>Settings</span>
            </a>
          </nav>
        </div>

        <div className="dash-sidebar-bottom">
          <div className="dash-user">
            <div className="dash-user-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="dash-user-info">
              <span className="dash-user-name">{displayName}</span>
              <span className="dash-user-email">{user?.email || 'user@example.com'}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          {/* Header */}
          <div className="dash-header animate-fade-in-up">
            <div>
              <h1 className="dash-greeting">
                Welcome back, <span className="text-gradient">{displayName}</span>
              </h1>
              <p className="dash-greeting-sub">Build, train, and deploy neural networks visually.</p>
            </div>
            <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>
              <Plus size={18} />
              New Project
            </button>
          </div>

          {/* Search */}
          <div className="dash-search-bar animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Search projects..."
              className="dash-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Project grid */}
          {filteredProjects.length > 0 ? (
            <div className="projects-grid">
              {filteredProjects.map((project, idx) => {
                const Icon = TEMPLATE_ICONS[project.template] || Layers;
                const nodeCount = project.graph_data?.nodes?.length || 0;
                return (
                  <div
                    key={project.id}
                    className="project-card animate-fade-in-up"
                    style={{ animationDelay: `${0.05 * (idx + 1)}s` }}
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    <div className="project-card-top">
                      <div className="project-icon">
                        <Icon size={20} />
                      </div>
                      <button
                        className="btn-icon project-delete"
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        title="Delete project"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <h3 className="project-name">{project.name}</h3>
                    <p className="project-desc">{project.description || 'No description'}</p>
                    <div className="project-meta">
                      <span className="badge badge-primary">{project.template || 'custom'}</span>
                      <span className="project-meta-item">
                        <Layers size={12} /> {nodeCount} layers
                      </span>
                      <span className="project-meta-item">
                        <Clock size={12} /> {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="project-card-action">
                      <span>Open workspace</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state animate-fade-in-up">
              <div className="empty-icon"><Layers size={48} /></div>
              <h3>No projects yet</h3>
              <p>Create your first neural network project to get started.</p>
              <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>
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
    </div>
  );
};



export default DashboardPage;
