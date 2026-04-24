import { create } from 'zustand';

// ================================================================
// AUTH STORE
// ================================================================
export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null, session: null }),
}));

// ================================================================
// PROJECT STORE
// ================================================================
export const useProjectStore = create((set, get) => ({
  projects: [],
  activeProject: null,
  loading: false,

  setProjects: (projects) => set({ projects }),
  setActiveProject: (project) => set({ activeProject: project }),
  setLoading: (loading) => set({ loading }),

  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
      activeProject:
        state.activeProject?.id === id
          ? { ...state.activeProject, ...updates }
          : state.activeProject,
    })),

  deleteProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProject: state.activeProject?.id === id ? null : state.activeProject,
    })),
}));

// ================================================================
// BUILDER STORE — with undo/redo + clipboard
// ================================================================
const MAX_HISTORY = 50;

export const useBuilderStore = create((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  activeTool: 'select', // 'select' | 'hand'

  // Undo/Redo history
  history: [],
  historyIndex: -1,

  // Clipboard
  clipboard: null,

  // --- History helpers ---
  _pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const snapshot = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({ nodes: prev.nodes, edges: prev.edges, historyIndex: historyIndex - 1, selectedNode: null });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({ nodes: next.nodes, edges: next.edges, historyIndex: historyIndex + 1, selectedNode: null });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // --- Core setters ---
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setActiveTool: (tool) => set({ activeTool: tool }),

  addNode: (node) => {
    get()._pushHistory();
    set((state) => ({ nodes: [...state.nodes, node] }));
  },

  updateNodeData: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
      selectedNode:
        state.selectedNode?.id === nodeId
          ? { ...state.selectedNode, data: { ...state.selectedNode.data, ...data } }
          : state.selectedNode,
    })),

  removeNode: (nodeId) => {
    get()._pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      selectedNode:
        state.selectedNode?.id === nodeId ? null : state.selectedNode,
    }));
  },

  clearCanvas: () => {
    get()._pushHistory();
    set({ nodes: [], edges: [], selectedNode: null });
  },

  loadGraph: (graphData) => {
    if (graphData && graphData.nodes && graphData.edges) {
      get()._pushHistory();
      set({
        nodes: graphData.nodes,
        edges: graphData.edges,
        selectedNode: null,
      });
    }
  },

  // --- Clipboard: copy/paste ---
  copySelectedNodes: (selectedNodeIds) => {
    const { nodes, edges } = get();
    const idSet = new Set(selectedNodeIds);
    const copiedNodes = nodes.filter((n) => idSet.has(n.id));
    const copiedEdges = edges.filter((e) => idSet.has(e.source) && idSet.has(e.target));
    set({ clipboard: { nodes: copiedNodes, edges: copiedEdges } });
  },

  pasteClipboard: () => {
    const { clipboard, nodes, edges } = get();
    if (!clipboard || clipboard.nodes.length === 0) return;
    get()._pushHistory();

    const idMap = {};
    const newNodes = clipboard.nodes.map((n) => {
      const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      idMap[n.id] = newId;
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + 40, y: n.position.y + 40 },
        selected: false,
      };
    });

    const newEdges = clipboard.edges.map((e) => ({
      ...e,
      id: `e_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      source: idMap[e.source] || e.source,
      target: idMap[e.target] || e.target,
    }));

    set({
      nodes: [...nodes, ...newNodes],
      edges: [...edges, ...newEdges],
    });
  },

  // --- Duplicate selected nodes ---
  duplicateNodes: (selectedNodeIds) => {
    const { nodes, edges } = get();
    get()._pushHistory();
    const idSet = new Set(selectedNodeIds);
    const idMap = {};

    const newNodes = nodes.filter((n) => idSet.has(n.id)).map((n) => {
      const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      idMap[n.id] = newId;
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + 40, y: n.position.y + 40 },
        selected: false,
      };
    });

    const newEdges = edges.filter((e) => idSet.has(e.source) && idSet.has(e.target)).map((e) => ({
      ...e,
      id: `e_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      source: idMap[e.source],
      target: idMap[e.target],
    }));

    set({
      nodes: [...nodes, ...newNodes],
      edges: [...edges, ...newEdges],
    });
  },
}));

// ================================================================
// TRAINING STORE
// ================================================================
export const useTrainingStore = create((set) => ({
  jobs: [],
  activeJob: null,
  metrics: [],
  status: 'idle', // idle, running, completed, failed
  compiledCode: null,
  modelSummary: null,
  modelId: null,

  setJobs: (jobs) => set({ jobs }),
  setActiveJob: (job) => set({ activeJob: job }),
  setMetrics: (metrics) => set({ metrics }),
  setStatus: (status) => set({ status }),
  setCompiledCode: (code) => set({ compiledCode: code }),
  setModelSummary: (summary) => set({ modelSummary: summary }),
  setModelId: (id) => set({ modelId: id }),

  addMetricEpoch: (epoch) =>
    set((state) => ({ metrics: [...state.metrics, epoch] })),

  reset: () =>
    set({ activeJob: null, metrics: [], status: 'idle', compiledCode: null, modelSummary: null, modelId: null }),
}));

// ================================================================
// DATASET STORE
// ================================================================
export const useDatasetStore = create((set) => ({
  activeDataset: null,  // { name, type, shape, num_samples, num_classes }
  loading: false,

  setActiveDataset: (dataset) => set({ activeDataset: dataset }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ activeDataset: null }),
}));

// ================================================================
// DEPLOYMENT STORE — persists active deployment to localStorage
// ================================================================
const _loadStoredDeployment = () => {
  try {
    const raw = localStorage.getItem('ll_active_deployment');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const useDeployStore = create((set) => ({
  deployments: [],
  activeDeployment: _loadStoredDeployment(),  // hydrate from localStorage

  setDeployments: (deployments) => set({ deployments }),

  setActiveDeployment: (deployment) => {
    // Persist to localStorage so it survives page refresh
    if (deployment) {
      try { localStorage.setItem('ll_active_deployment', JSON.stringify(deployment)); } catch {}
    } else {
      localStorage.removeItem('ll_active_deployment');
    }
    set({ activeDeployment: deployment });
  },

  clearDeployment: () => {
    localStorage.removeItem('ll_active_deployment');
    set({ activeDeployment: null });
  },

  addDeployment: (deployment) =>
    set((state) => ({ deployments: [deployment, ...state.deployments] })),
}));
