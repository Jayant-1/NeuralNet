// ================================================================
// KERAS / PYTORCH CODE GENERATOR
// Proper topological sort + all layer types + editable params
// ================================================================

/**
 * Topological sort using DFS
 */
function topologicalSort(nodes, edges) {
  const adj = {};
  const inDeg = {};
  nodes.forEach((n) => { adj[n.id] = []; inDeg[n.id] = 0; });
  edges.forEach((e) => {
    adj[e.source]?.push(e.target);
    inDeg[e.target] = (inDeg[e.target] || 0) + 1;
  });

  const queue = nodes.filter((n) => inDeg[n.id] === 0).map((n) => n.id);
  const sorted = [];
  while (queue.length > 0) {
    const id = queue.shift();
    sorted.push(id);
    for (const neighbor of (adj[id] || [])) {
      inDeg[neighbor]--;
      if (inDeg[neighbor] === 0) queue.push(neighbor);
    }
  }
  return sorted;
}

/**
 * Generate Keras code from nodes and edges
 */
export function generateKerasCode(nodes, edges) {
  if (!nodes || nodes.length === 0) {
    return '# Drag layers onto the canvas to start building your model.\n# Connect them in order from Input → Output.';
  }

  const inputNode = nodes.find((n) => n.data.type === 'input');
  if (!inputNode) {
    return '# ⚠ Missing Input layer\n# Add an Input layer to define data shape.';
  }

  const sorted = topologicalSort(nodes, edges);
  const nodeMap = {};
  nodes.forEach((n) => { nodeMap[n.id] = n; });

  // Determine which imports we need
  const usedTypes = new Set(nodes.map((n) => n.data.type));
  const imports = ['import tensorflow as tf', 'from tensorflow import keras', 'from tensorflow.keras import layers', ''];

  let code = imports.join('\n');
  code += 'model = keras.Sequential([\n';

  for (const id of sorted) {
    const node = nodeMap[id];
    if (!node) continue;
    const { type, params = {} } = node.data;
    const line = kerasLayerLine(type, params);
    if (line) {
      code += `    ${line},\n`;
    }
  }

  code += '])\n\n';
  code += "model.compile(\n    optimizer='adam',\n    loss='categorical_crossentropy',\n    metrics=['accuracy']\n)\n\n";
  code += 'model.summary()';

  return code;
}

function kerasLayerLine(type, params) {
  switch (type) {
    case 'input':
      return `keras.Input(shape=${params.shape || '(28, 28, 1)'})`;
    case 'dense': {
      const act = params.activation ? `, activation='${params.activation}'` : '';
      return `layers.Dense(${params.units || 64}${act})`;
    }
    case 'conv2d': {
      const act = params.activation ? `, activation='${params.activation}'` : '';
      return `layers.Conv2D(${params.filters || 32}, ${params.kernel_size || '(3, 3)'}${act})`;
    }
    case 'maxpool2d':
      return `layers.MaxPooling2D(pool_size=${params.pool_size || '(2, 2)'})`;
    case 'flatten':
      return 'layers.Flatten()';
    case 'dropout':
      return `layers.Dropout(${params.rate ?? 0.25})`;
    case 'batchnorm':
      return 'layers.BatchNormalization()';
    case 'activation':
      return `layers.Activation('${params.function || 'relu'}')`;
    case 'lstm': {
      const rs = params.return_sequences === true || params.return_sequences === 'true'
        ? ', return_sequences=True'
        : '';
      return `layers.LSTM(${params.units || 128}${rs})`;
    }
    case 'embedding':
      return `layers.Embedding(input_dim=${params.input_dim || 10000}, output_dim=${params.output_dim || 128})`;
    case 'output': {
      const units = params.units || 10;
      const act = params.activation ? `, activation='${params.activation}'` : '';
      return `layers.Dense(${units}${act})`;
    }
    default:
      return `# Unknown layer: ${type}`;
  }
}

/**
 * Generate PyTorch code from nodes and edges
 */
export function generatePyTorchCode(nodes, edges) {
  if (!nodes || nodes.length === 0) {
    return '# Drag layers onto the canvas to start building your model.\n# Connect them in order from Input → Output.';
  }

  const inputNode = nodes.find((n) => n.data.type === 'input');
  if (!inputNode) {
    return '# ⚠ Missing Input layer\n# Add an Input layer to define data shape.';
  }

  const sorted = topologicalSort(nodes, edges);
  const nodeMap = {};
  nodes.forEach((n) => { nodeMap[n.id] = n; });

  let code = 'import torch\nimport torch.nn as nn\nimport torch.nn.functional as F\n\n';
  code += 'class NeuralNetwork(nn.Module):\n';
  code += '    def __init__(self):\n';
  code += '        super().__init__()\n';

  const layerDefs = [];
  const forwardLines = [];
  let layerIdx = 0;

  for (const id of sorted) {
    const node = nodeMap[id];
    if (!node) continue;
    const { type, params = {} } = node.data;
    const result = pytorchLayer(type, params, layerIdx);
    if (result) {
      if (result.init) {
        layerDefs.push(`        self.${result.name} = ${result.init}`);
      }
      if (result.forward) {
        forwardLines.push(`        ${result.forward}`);
      }
      layerIdx++;
    }
  }

  code += layerDefs.join('\n') + '\n\n';
  code += '    def forward(self, x):\n';
  code += forwardLines.join('\n') + '\n';
  code += '        return x\n\n';
  code += 'model = NeuralNetwork()\nprint(model)';

  return code;
}

function pytorchLayer(type, params, idx) {
  const name = `layer${idx}`;
  switch (type) {
    case 'input':
      return { name, forward: `# Input shape: ${params.shape || '(28, 28, 1)'}` };
    case 'dense':
      return {
        name,
        init: `nn.Linear(${params.units || 64}, ${params.units || 64})`,
        forward: `x = self.${name}(x)${params.activation === 'relu' ? '\n        x = F.relu(x)' : ''}`,
      };
    case 'conv2d':
      return {
        name,
        init: `nn.Conv2d(in_channels=1, out_channels=${params.filters || 32}, kernel_size=${params.kernel_size || '(3, 3)'})`,
        forward: `x = self.${name}(x)${params.activation === 'relu' ? '\n        x = F.relu(x)' : ''}`,
      };
    case 'maxpool2d':
      return { name, forward: `x = F.max_pool2d(x, ${params.pool_size || '(2, 2)'})` };
    case 'flatten':
      return { name, forward: 'x = torch.flatten(x, 1)' };
    case 'dropout':
      return { name, init: `nn.Dropout(p=${params.rate ?? 0.25})`, forward: `x = self.${name}(x)` };
    case 'batchnorm':
      return { name, init: 'nn.BatchNorm1d(num_features=64)', forward: `x = self.${name}(x)` };
    case 'activation':
      return { name, forward: `x = F.${params.function || 'relu'}(x)` };
    case 'lstm':
      return { name, init: `nn.LSTM(input_size=128, hidden_size=${params.units || 128}, batch_first=True)`, forward: `x, _ = self.${name}(x)` };
    case 'embedding':
      return { name, init: `nn.Embedding(${params.input_dim || 10000}, ${params.output_dim || 128})`, forward: `x = self.${name}(x)` };
    case 'output': {
      const units = params.units || 10;
      return {
        name,
        init: `nn.Linear(in_features, ${units})`,
        forward: `x = self.${name}(x)${params.activation === 'softmax' ? '\n        x = F.softmax(x, dim=-1)' : params.activation === 'sigmoid' ? '\n        x = torch.sigmoid(x)' : ''}`,
      };
    }
    default:
      return { name, forward: `# Unknown: ${type}` };
  }
}
