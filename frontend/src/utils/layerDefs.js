// ================================================================
// LAYER TYPE DEFINITIONS
// ================================================================

export const LAYER_CATEGORIES = [
  {
    section: 'Input / Output',
    items: [
      { type: 'input', label: 'Input', desc: 'Entry point for data', iconName: 'ArrowDownToLine', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', defaultParams: { shape: '(28, 28, 1)' } },
      { type: 'output', label: 'Output', desc: 'Model output', iconName: 'ArrowUpFromLine', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', defaultParams: {} },
    ],
  },
  {
    section: 'Core Layers',
    items: [
      { type: 'dense', label: 'Dense', desc: 'Fully connected layer', iconName: 'Link', color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)', defaultParams: { units: 64, activation: 'relu' } },
      { type: 'activation', label: 'Activation', desc: 'Activation function', iconName: 'Zap', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', defaultParams: { function: 'relu' } },
      { type: 'dropout', label: 'Dropout', desc: 'Regularization layer', iconName: 'Scissors', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', defaultParams: { rate: 0.25 } },
      { type: 'batchnorm', label: 'BatchNorm', desc: 'Batch normalization', iconName: 'BarChart3', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)', defaultParams: {} },
      { type: 'flatten', label: 'Flatten', desc: 'Flatten to 1D', iconName: 'AlignJustify', color: '#64748b', bgColor: 'rgba(100, 116, 139, 0.1)', borderColor: 'rgba(100, 116, 139, 0.3)', defaultParams: {} },
    ],
  },
  {
    section: 'Convolutional',
    items: [
      { type: 'conv2d', label: 'Conv2D', desc: '2D convolution layer', iconName: 'Grid3x3', color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.3)', defaultParams: { filters: 32, kernel_size: '(3, 3)', activation: 'relu' } },
      { type: 'maxpool2d', label: 'MaxPool2D', desc: 'Max pooling layer', iconName: 'Minimize2', color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.3)', defaultParams: { pool_size: '(2, 2)' } },
    ],
  },
  {
    section: 'Recurrent',
    items: [
      { type: 'lstm', label: 'LSTM', desc: 'Long Short-Term Memory', iconName: 'GitBranch', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.3)', defaultParams: { units: 128, return_sequences: false } },
      { type: 'embedding', label: 'Embedding', desc: 'Token embedding layer', iconName: 'Hash', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.3)', defaultParams: { input_dim: 10000, output_dim: 128 } },
    ],
  },
];

// Flat lookup for layer info by type
export const LAYER_INFO = {};
LAYER_CATEGORIES.forEach((cat) => {
  cat.items.forEach((item) => {
    LAYER_INFO[item.type] = item;
  });
});

// Parameter definitions for each layer type
export const LAYER_PARAMS = {
  input: [
    { key: 'shape', label: 'Shape', type: 'text', placeholder: '(28, 28, 1)' },
  ],
  output: [],
  dense: [
    { key: 'units', label: 'Units', type: 'number', min: 1 },
    { key: 'activation', label: 'Activation', type: 'select', options: ['relu', 'sigmoid', 'tanh', 'softmax', 'linear', 'swish'] },
  ],
  activation: [
    { key: 'function', label: 'Function', type: 'select', options: ['relu', 'sigmoid', 'tanh', 'softmax', 'leaky_relu', 'swish', 'elu'] },
  ],
  dropout: [
    { key: 'rate', label: 'Rate', type: 'number', min: 0, max: 1, step: 0.05 },
  ],
  batchnorm: [],
  flatten: [],
  conv2d: [
    { key: 'filters', label: 'Filters', type: 'number', min: 1 },
    { key: 'kernel_size', label: 'Kernel Size', type: 'text', placeholder: '(3, 3)' },
    { key: 'activation', label: 'Activation', type: 'select', options: ['relu', 'sigmoid', 'tanh', 'linear', 'swish'] },
  ],
  maxpool2d: [
    { key: 'pool_size', label: 'Pool Size', type: 'text', placeholder: '(2, 2)' },
  ],
  lstm: [
    { key: 'units', label: 'Units', type: 'number', min: 1 },
    { key: 'return_sequences', label: 'Return Sequences', type: 'select', options: ['true', 'false'] },
  ],
  embedding: [
    { key: 'input_dim', label: 'Vocab Size', type: 'number', min: 1 },
    { key: 'output_dim', label: 'Embed Dim', type: 'number', min: 1 },
  ],
};

export default LAYER_CATEGORIES;
