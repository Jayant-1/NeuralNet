import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useProjectStore } from '../store/store';
import { projectsApi } from '../services/api';
import { TEMPLATES } from '../utils/templates';
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

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProject.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    setLoading(true);

    const templateData = newProject.template ? TEMPLATES[newProject.template] : null;
    const projectData = {
      name: newProject.name,
      description: newProject.description,
      template: newProject.template || 'custom',
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
    setNewProject({ name: '', description: '', template: '' });
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

      {/* Create project modal */}
      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
              <div>
                <h2 className="modal-title">New Project</h2>
                <p className="modal-subtitle" style={{ marginBottom: 0 }}>Choose a template or start from scratch</p>
              </div>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="auth-form">
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="My Neural Network"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="What will this model do?"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Template</label>
                <div className="template-grid">
                  {[
                    { key: '', label: 'Blank', desc: 'Start from scratch', icon: Plus, color: '#64748b' },
                    ...Object.entries(TEMPLATES).map(([key, tpl]) => ({
                      key,
                      label: tpl.name.split(' ')[0],
                      desc: tpl.description.substring(0, 40) + '...',
                      icon: TEMPLATE_ICONS[key],
                      color: tpl.color,
                    })),
                  ].map((tpl) => {
                    const TplIcon = tpl.icon;
                    return (
                      <div
                        key={tpl.key}
                        className={`template-option ${newProject.template === tpl.key ? 'active' : ''}`}
                        onClick={() => setNewProject({ ...newProject, template: tpl.key })}
                      >
                        <TplIcon size={20} style={{ color: tpl.color }} />
                        <span className="template-label">{tpl.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <>Create Project <ArrowRight size={16} /></>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};



export default DashboardPage;
