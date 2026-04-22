// ================================================================
// GRAPH → JSON CONVERTER + VALIDATOR
// Converts React Flow nodes/edges to a clean JSON for the backend
// ================================================================

/**
 * Topological sort using Kahn's algorithm
 */
function topologicalSort(nodes, edges) {
  const adjacency = {};
  const inDegree = {};

  nodes.forEach((n) => {
    adjacency[n.id] = [];
    inDegree[n.id] = 0;
  });

  edges.forEach((e) => {
    adjacency[e.source].push(e.target);
    inDegree[e.target] = (inDegree[e.target] || 0) + 1;
  });

  const queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
  const sorted = [];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    sorted.push(nodeId);
    for (const neighbor of adjacency[nodeId]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  return sorted;
}

/**
 * Validate graph structure
 */
export function validateGraph(nodes, edges) {
  const errors = [];

  if (nodes.length === 0) {
    errors.push('Graph is empty. Add some layers first.');
    return { valid: false, errors };
  }

  const inputNodes = nodes.filter((n) => n.data.type === 'input');
  const outputNodes = nodes.filter((n) => n.data.type === 'output');

  if (inputNodes.length === 0) {
    errors.push('Network must have an Input layer.');
  }
  if (inputNodes.length > 1) {
    errors.push('Only one Input layer is allowed for Sequential models.');
  }
  if (outputNodes.length === 0) {
    errors.push('Network must have an Output layer.');
  }
  if (outputNodes.length > 1) {
    errors.push('Only one Output layer is allowed for Sequential models.');
  }

  // Check for disconnected nodes
  const connectedIds = new Set();
  edges.forEach((e) => {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  });
  const disconnected = nodes.filter(
    (n) => !connectedIds.has(n.id) && nodes.length > 1
  );
  if (disconnected.length > 0) {
    errors.push(
      `Disconnected layer(s): ${disconnected.map((n) => n.data.label).join(', ')}`
    );
  }

  // Check for cycles using topological sort
  const sorted = topologicalSort(nodes, edges);
  if (sorted.length !== nodes.length) {
    errors.push('Graph contains a cycle. Neural networks must be acyclic.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Convert React Flow graph to clean JSON for backend
 */
export function graphToJson(nodes, edges) {
  const sorted = topologicalSort(nodes, edges);
  const nodeMap = {};
  nodes.forEach((n) => {
    nodeMap[n.id] = n;
  });

  const layers = sorted.map((id) => {
    const node = nodeMap[id];
    return {
      id: node.id,
      type: node.data.type,
      label: node.data.label,
      params: node.data.params || {},
    };
  });

  const connections = edges.map((e) => ({
    from: e.source,
    to: e.target,
  }));

  return { layers, connections };
}

export default graphToJson;
