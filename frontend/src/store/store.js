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
// BUILDER STORE
// ================================================================
let nodeIdCounter = 0;
export const getNodeId = () => `node_${Date.now()}_${nodeIdCounter++}`;

export const useBuilderStore = create((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (node) => set({ selectedNode: node }),

  addNode: (node) =>
    set((state) => ({ nodes: [...state.nodes, node] })),

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

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      selectedNode:
        state.selectedNode?.id === nodeId ? null : state.selectedNode,
    })),

  clearCanvas: () => set({ nodes: [], edges: [], selectedNode: null }),

  loadGraph: (graphData) => {
    if (graphData && graphData.nodes && graphData.edges) {
      set({
        nodes: graphData.nodes,
        edges: graphData.edges,
        selectedNode: null,
      });
    }
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

  setJobs: (jobs) => set({ jobs }),
  setActiveJob: (job) => set({ activeJob: job }),
  setMetrics: (metrics) => set({ metrics }),
  setStatus: (status) => set({ status }),

  addMetricEpoch: (epoch) =>
    set((state) => ({ metrics: [...state.metrics, epoch] })),

  reset: () =>
    set({ activeJob: null, metrics: [], status: 'idle' }),
}));

// ================================================================
// DEPLOYMENT STORE
// ================================================================
export const useDeployStore = create((set) => ({
  deployments: [],
  activeDeployment: null,

  setDeployments: (deployments) => set({ deployments }),
  setActiveDeployment: (deployment) => set({ activeDeployment: deployment }),

  addDeployment: (deployment) =>
    set((state) => ({ deployments: [deployment, ...state.deployments] })),
}));
