import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useBuilderStore, useProjectStore } from '../store/store';
import { projectsApi } from '../services/api';
import { generateKerasCode } from '../utils/codeGenerator';
import {
  Box, Undo2, Redo2, Download, ArrowLeft, Save, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Navbar.css';

const Navbar = ({ projectName, onBack, activeTab }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [saving, setSaving] = React.useState(false);

  const handleLogout = () => {
    localStorage.removeItem('ll_token');
    localStorage.removeItem('ll_user');
    useAuthStore.getState().logout();
    toast.success('Signed out');
    navigate('/login');
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
      toast.success('Project saved!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const { nodes, edges } = useBuilderStore.getState();
    const code = generateKerasCode(nodes, edges);
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.py';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded model.py');
  };

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {onBack && (
          <button className="btn-icon" onClick={onBack} title="Back to dashboard">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="header-logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon-wrap">
            <Box size={18} />
          </div>
          <span className="logo-text">LayerLab</span>
        </div>
        {projectName && (
          <>
            <div className="divider" />
            <span className="project-name-nav">{projectName}</span>
          </>
        )}
      </div>

      <div className="navbar-right">
        {activeTab === 'builder' && (
          <>
            <div className="navbar-center-actions">
              <button className="btn-icon" title="Undo"><Undo2 size={17} /></button>
              <button className="btn-icon" title="Redo"><Redo2 size={17} /></button>
            </div>
            <div className="divider" />
            <button className="btn btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
            <button className="btn btn-sm" onClick={handleExport}>
              <Download size={14} /> Export
            </button>
          </>
        )}

        <div className="divider" />

        <div className="navbar-user" onClick={handleLogout} title="Sign out">
          <div className="navbar-user-avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
