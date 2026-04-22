import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore, useBuilderStore, useTrainingStore, useDeployStore } from '../store/store';
import { projectsApi } from '../services/api';
import { generateKerasCode, generatePyTorchCode } from '../utils/codeGenerator';
import { TEMPLATES } from '../utils/templates';

// Components
import WorkspaceNavbar from '../components/Navbar';
import LeftSidebar from '../components/Sidebar/LeftSidebar';
import RightSidebar from '../components/Sidebar/RightSidebar';
import BuilderCanvas from '../components/Canvas/BuilderCanvas';
import DatasetUpload from '../components/Dataset/DatasetUpload';
import TrainingConfig from '../components/Training/TrainingConfig';
import TrainingResults from '../components/Training/TrainingResults';
import DeployPanel from '../components/Deploy/DeployPanel';
import ApiPlayground from '../components/Playground/ApiPlayground';

import {
  Layers, Database, Play, BarChart3, Rocket, Terminal
} from 'lucide-react';
import './ProjectWorkspace.css';

const TABS = [
  { id: 'builder', label: 'Builder', icon: Layers },
  { id: 'dataset', label: 'Dataset', icon: Database },
  { id: 'training', label: 'Training', icon: Play },
  { id: 'results', label: 'Results', icon: BarChart3 },
  { id: 'deploy', label: 'Deploy', icon: Rocket },
  { id: 'playground', label: 'Playground', icon: Terminal },
];

const ProjectWorkspace = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { activeProject, setActiveProject } = useProjectStore();
  const { nodes, edges, setNodes, setEdges, loadGraph } = useBuilderStore();
  const [activeTab, setActiveTab] = useState('builder');
  const [framework, setFramework] = useState('keras');
  const [generatedCode, setGeneratedCode] = useState('');

  // Load project
  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    // Try from store first
    const { projects } = useProjectStore.getState();
    const local = projects.find((p) => p.id === projectId);
    if (local) {
      setActiveProject(local);
      if (local.graph_data) {
        loadGraph(local.graph_data);
      }
      return;
    }

    // Try from API
    try {
      const { data } = await projectsApi.get(projectId);
      if (data) {
        setActiveProject(data);
        if (data.graph_data) loadGraph(data.graph_data);
      }
    } catch {
      navigate('/dashboard');
    }
  };

  // Regenerate code when graph changes
  const handleGraphChange = useCallback((newNodes, newEdges) => {
    setTimeout(() => {
      const code = framework === 'keras'
        ? generateKerasCode(newNodes, newEdges)
        : generatePyTorchCode(newNodes, newEdges);
      setGeneratedCode(code);
    }, 100);
  }, [framework]);

  // Regenerate when framework changes
  useEffect(() => {
    const code = framework === 'keras'
      ? generateKerasCode(nodes, edges)
      : generatePyTorchCode(nodes, edges);
    setGeneratedCode(code);
  }, [framework, nodes, edges]);

  // Save graph data periodically
  useEffect(() => {
    if (!activeProject) return;
    const timer = setTimeout(() => {
      const graphData = { nodes, edges };
      useProjectStore.getState().updateProject(activeProject.id, {
        graph_data: graphData,
        updated_at: new Date().toISOString(),
      });
      // Persist to API
      projectsApi.update(activeProject.id, { graph_data: graphData }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'builder':
        return (
          <div className="workspace-builder">
            <LeftSidebar />
            <div className="canvas-wrapper">
              <BuilderCanvas onGraphChange={handleGraphChange} />
            </div>
            <RightSidebar
              code={generatedCode}
              framework={framework}
              onFrameworkChange={setFramework}
            />
          </div>
        );
      case 'dataset':
        return <DatasetUpload projectId={projectId} />;
      case 'training':
        return <TrainingConfig projectId={projectId} nodes={nodes} edges={edges} />;
      case 'results':
        return <TrainingResults projectId={projectId} />;
      case 'deploy':
        return <DeployPanel projectId={projectId} />;
      case 'playground':
        return <ApiPlayground projectId={projectId} />;
      default:
        return null;
    }
  };

  return (
    <div className="workspace-layout">
      <WorkspaceNavbar
        projectName={activeProject?.name || 'Loading...'}
        onBack={() => navigate('/dashboard')}
        activeTab={activeTab}
      />

      {/* Tab bar */}
      <div className="workspace-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`workspace-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="workspace-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ProjectWorkspace;
