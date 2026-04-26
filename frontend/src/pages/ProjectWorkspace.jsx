import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { projectsApi } from "../services/api";
import { useBuilderStore, useProjectStore } from "../store/store";
import { generateKerasCode, generatePyTorchCode } from "../utils/codeGenerator";

// Components
import BuilderCanvas from "../components/Canvas/BuilderCanvas";
import DatasetUpload from "../components/Dataset/DatasetUpload";
import PreprocessingConfig from "../components/Dataset/PreprocessingConfig";
import DeployPanel from "../components/Deploy/DeployPanel";
import ApiPlayground from "../components/Playground/ApiPlayground";
import LeftSidebar from "../components/Sidebar/LeftSidebar";
import RightSidebar from "../components/Sidebar/RightSidebar";
import TrainingConfig from "../components/Training/TrainingConfig";
import TrainingResults from "../components/Training/TrainingResults";
import WorkspaceNavbar from "../components/workspace/WorkspaceNavbar";

import {
  BarChart3,
  Database,
  Layers,
  Play,
  Rocket,
  Terminal,
} from "lucide-react";

const TABS = [
  { id: "builder", label: "Builder", icon: Layers },
  { id: "dataset", label: "Dataset", icon: Database },
  { id: "training", label: "Training", icon: Play },
  { id: "results", label: "Results", icon: BarChart3 },
  { id: "deploy", label: "Deploy", icon: Rocket },
  { id: "playground", label: "Playground", icon: Terminal },
];

const ProjectWorkspace = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { activeProject, setActiveProject } = useProjectStore();
  const { nodes, edges, loadGraph } = useBuilderStore();
  const [activeTab, setActiveTab] = useState("builder");
  const [framework, setFramework] = useState("keras");
  const [generatedCode, setGeneratedCode] = useState("");
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(288);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);
  const [leftMinimized, setLeftMinimized] = useState(false);
  const [rightMinimized, setRightMinimized] = useState(false);
  const [resizeState, setResizeState] = useState(null);

  const MIN_SIDEBAR_WIDTH = 240;
  const MAX_SIDEBAR_WIDTH = 520;

  const startResize = useCallback(
    (side, event) => {
      event.preventDefault();
      if (side === "left" && leftMinimized) return;
      if (side === "right" && rightMinimized) return;

      setResizeState({
        side,
        startX: event.clientX,
        startWidth: side === "left" ? leftSidebarWidth : rightSidebarWidth,
      });
    },
    [leftMinimized, rightMinimized, leftSidebarWidth, rightSidebarWidth],
  );

  useEffect(() => {
    if (!resizeState) return;

    const onMouseMove = (event) => {
      const deltaX = event.clientX - resizeState.startX;
      if (resizeState.side === "left") {
        const nextWidth = Math.max(
          MIN_SIDEBAR_WIDTH,
          Math.min(MAX_SIDEBAR_WIDTH, resizeState.startWidth + deltaX),
        );
        setLeftSidebarWidth(nextWidth);
      } else {
        const nextWidth = Math.max(
          MIN_SIDEBAR_WIDTH,
          Math.min(MAX_SIDEBAR_WIDTH, resizeState.startWidth - deltaX),
        );
        setRightSidebarWidth(nextWidth);
      }
    };

    const onMouseUp = () => setResizeState(null);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizeState]);

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
      navigate("/dashboard");
    }
  };

  // Regenerate code when graph changes
  const handleGraphChange = useCallback(
    (newNodes, newEdges) => {
      setTimeout(() => {
        const code =
          framework === "keras"
            ? generateKerasCode(newNodes, newEdges)
            : generatePyTorchCode(newNodes, newEdges);
        setGeneratedCode(code);
      }, 100);
    },
    [framework],
  );

  // Regenerate when framework changes
  useEffect(() => {
    const code =
      framework === "keras"
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
      projectsApi
        .update(activeProject.id, { graph_data: graphData })
        .catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "builder":
        return (
          <div className="flex-1 flex overflow-hidden relative">
            <LeftSidebar
              width={leftMinimized ? 20 : leftSidebarWidth}
              minimized={leftMinimized}
              onToggleMinimize={() => setLeftMinimized((v) => !v)}
              onResizeStart={(e) => startResize("left", e)}
            />
            <div className="flex-1 relative">
              <BuilderCanvas onGraphChange={handleGraphChange} />
            </div>
            <RightSidebar
              width={rightMinimized ? 20 : rightSidebarWidth}
              minimized={rightMinimized}
              onToggleMinimize={() => setRightMinimized((v) => !v)}
              onResizeStart={(e) => startResize("right", e)}
              code={generatedCode}
              framework={framework}
              onFrameworkChange={setFramework}
              onCodeUpdate={setGeneratedCode}
            />
          </div>
        );
      case "dataset":
        return (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 max-w-6xl mx-auto w-full">
            <DatasetUpload projectId={projectId} />
            <PreprocessingConfig
              projectId={projectId}
              problemType={activeProject?.problem_type}
            />
          </div>
        );
      case "training":
        return (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-5xl mx-auto w-full">
            <TrainingConfig projectId={projectId} nodes={nodes} edges={edges} />
          </div>
        );
      case "results":
        return (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-6xl mx-auto w-full">
            <TrainingResults projectId={projectId} />
          </div>
        );
      case "deploy":
        return (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
            <DeployPanel projectId={projectId} />
          </div>
        );
      case "playground":
        return (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-5xl mx-auto w-full">
            <ApiPlayground projectId={projectId} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#06070B] overflow-hidden text-[#E0E0E8]">
      <WorkspaceNavbar
        projectName={activeProject?.name || "Loading..."}
        onBack={() => navigate("/dashboard")}
        activeTab={activeTab}
      />

      {/* Tab bar — Editorial Cyber Lab style */}
      <div className="shrink-0 bg-[#0B0B10] border-b border-white/5 px-6 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar z-40">
        <div className="flex space-x-1 w-max mx-auto md:mx-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-300 font-mono text-xs font-semibold tracking-wider uppercase ${
                  isActive
                    ? "bg-[#0A6F7A] text-cyan border border-cyan/40 shadow-[0_0_20px_rgba(12,233,255,0.15)]"
                    : "text-dim hover:text-white hover:bg-white/8 border border-transparent"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon
                  size={15}
                  className={isActive ? "text-cyan" : "text-dim"}
                />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(12,233,255,0.05),transparent),radial-gradient(circle_at_bottom_right,rgba(104,116,255,0.06),transparent),linear-gradient(to_bottom,#06070B,#08091a)]">
        <div className="grain-overlay pointer-events-none" />
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ProjectWorkspace;
