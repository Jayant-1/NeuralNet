// ================================================================
// PREDEFINED NEURAL NETWORK TEMPLATES
// ================================================================

export const TEMPLATES = {
  mlp: {
    name: 'Multi-Layer Perceptron',
    description: 'Classic fully-connected feedforward network. Great for tabular data.',
    icon: 'Layers',
    color: '#6366f1',
    nodes: [
      { id: 'tpl_1', type: 'custom', position: { x: 250, y: 0 }, data: { type: 'input', label: 'Input', params: { shape: '(784,)' } } },
      { id: 'tpl_2', type: 'custom', position: { x: 250, y: 120 }, data: { type: 'dense', label: 'Dense', params: { units: 256, activation: 'relu' } } },
      { id: 'tpl_3', type: 'custom', position: { x: 250, y: 240 }, data: { type: 'dropout', label: 'Dropout', params: { rate: 0.3 } } },
      { id: 'tpl_4', type: 'custom', position: { x: 250, y: 360 }, data: { type: 'dense', label: 'Dense', params: { units: 128, activation: 'relu' } } },
      { id: 'tpl_5', type: 'custom', position: { x: 250, y: 480 }, data: { type: 'dropout', label: 'Dropout', params: { rate: 0.2 } } },
      { id: 'tpl_6', type: 'custom', position: { x: 250, y: 600 }, data: { type: 'dense', label: 'Dense', params: { units: 10, activation: 'softmax' } } },
      { id: 'tpl_7', type: 'custom', position: { x: 250, y: 720 }, data: { type: 'output', label: 'Output', params: {} } },
    ],
    edges: [
      { id: 'e1-2', source: 'tpl_1', target: 'tpl_2' },
      { id: 'e2-3', source: 'tpl_2', target: 'tpl_3' },
      { id: 'e3-4', source: 'tpl_3', target: 'tpl_4' },
      { id: 'e4-5', source: 'tpl_4', target: 'tpl_5' },
      { id: 'e5-6', source: 'tpl_5', target: 'tpl_6' },
      { id: 'e6-7', source: 'tpl_6', target: 'tpl_7' },
    ],
  },

  cnn: {
    name: 'Convolutional Neural Network',
    description: 'Image classification model with convolutional layers. Great for vision tasks.',
    icon: 'ScanLine',
    color: '#a855f7',
    nodes: [
      { id: 'tpl_1', type: 'custom', position: { x: 250, y: 0 }, data: { type: 'input', label: 'Input', params: { shape: '(28, 28, 1)' } } },
      { id: 'tpl_2', type: 'custom', position: { x: 250, y: 120 }, data: { type: 'conv2d', label: 'Conv2D', params: { filters: 32, kernel_size: '(3, 3)', activation: 'relu' } } },
      { id: 'tpl_3', type: 'custom', position: { x: 250, y: 240 }, data: { type: 'maxpool2d', label: 'MaxPool2D', params: { pool_size: '(2, 2)' } } },
      { id: 'tpl_4', type: 'custom', position: { x: 250, y: 360 }, data: { type: 'conv2d', label: 'Conv2D', params: { filters: 64, kernel_size: '(3, 3)', activation: 'relu' } } },
      { id: 'tpl_5', type: 'custom', position: { x: 250, y: 480 }, data: { type: 'maxpool2d', label: 'MaxPool2D', params: { pool_size: '(2, 2)' } } },
      { id: 'tpl_6', type: 'custom', position: { x: 250, y: 600 }, data: { type: 'flatten', label: 'Flatten', params: {} } },
      { id: 'tpl_7', type: 'custom', position: { x: 250, y: 720 }, data: { type: 'dense', label: 'Dense', params: { units: 128, activation: 'relu' } } },
      { id: 'tpl_8', type: 'custom', position: { x: 250, y: 840 }, data: { type: 'dropout', label: 'Dropout', params: { rate: 0.5 } } },
      { id: 'tpl_9', type: 'custom', position: { x: 250, y: 960 }, data: { type: 'dense', label: 'Dense', params: { units: 10, activation: 'softmax' } } },
      { id: 'tpl_10', type: 'custom', position: { x: 250, y: 1080 }, data: { type: 'output', label: 'Output', params: {} } },
    ],
    edges: [
      { id: 'e1-2', source: 'tpl_1', target: 'tpl_2' },
      { id: 'e2-3', source: 'tpl_2', target: 'tpl_3' },
      { id: 'e3-4', source: 'tpl_3', target: 'tpl_4' },
      { id: 'e4-5', source: 'tpl_4', target: 'tpl_5' },
      { id: 'e5-6', source: 'tpl_5', target: 'tpl_6' },
      { id: 'e6-7', source: 'tpl_6', target: 'tpl_7' },
      { id: 'e7-8', source: 'tpl_7', target: 'tpl_8' },
      { id: 'e8-9', source: 'tpl_8', target: 'tpl_9' },
      { id: 'e9-10', source: 'tpl_9', target: 'tpl_10' },
    ],
  },

  rnn: {
    name: 'Recurrent Neural Network',
    description: 'Sequence model with LSTM layers. Great for text and time-series.',
    icon: 'GitBranch',
    color: '#06b6d4',
    nodes: [
      { id: 'tpl_1', type: 'custom', position: { x: 250, y: 0 }, data: { type: 'input', label: 'Input', params: { shape: '(100,)' } } },
      { id: 'tpl_2', type: 'custom', position: { x: 250, y: 120 }, data: { type: 'embedding', label: 'Embedding', params: { input_dim: 10000, output_dim: 128 } } },
      { id: 'tpl_3', type: 'custom', position: { x: 250, y: 240 }, data: { type: 'lstm', label: 'LSTM', params: { units: 128, return_sequences: true } } },
      { id: 'tpl_4', type: 'custom', position: { x: 250, y: 360 }, data: { type: 'lstm', label: 'LSTM', params: { units: 64, return_sequences: false } } },
      { id: 'tpl_5', type: 'custom', position: { x: 250, y: 480 }, data: { type: 'dropout', label: 'Dropout', params: { rate: 0.3 } } },
      { id: 'tpl_6', type: 'custom', position: { x: 250, y: 600 }, data: { type: 'dense', label: 'Dense', params: { units: 1, activation: 'sigmoid' } } },
      { id: 'tpl_7', type: 'custom', position: { x: 250, y: 720 }, data: { type: 'output', label: 'Output', params: {} } },
    ],
    edges: [
      { id: 'e1-2', source: 'tpl_1', target: 'tpl_2' },
      { id: 'e2-3', source: 'tpl_2', target: 'tpl_3' },
      { id: 'e3-4', source: 'tpl_3', target: 'tpl_4' },
      { id: 'e4-5', source: 'tpl_4', target: 'tpl_5' },
      { id: 'e5-6', source: 'tpl_5', target: 'tpl_6' },
      { id: 'e6-7', source: 'tpl_6', target: 'tpl_7' },
    ],
  },
};

export default TEMPLATES;
