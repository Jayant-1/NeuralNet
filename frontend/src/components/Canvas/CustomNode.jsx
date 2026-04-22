import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { LAYER_INFO } from '../../utils/layerDefs';
import {
  ArrowDownToLine, ArrowUpFromLine, Link, Zap, Grid3x3,
  Minimize2, AlignJustify, Scissors, BarChart3, GitBranch, Hash, X
} from 'lucide-react';
import { useBuilderStore } from '../../store/store';
import './CustomNode.css';

const ICON_MAP = {
  input: ArrowDownToLine,
  output: ArrowUpFromLine,
  dense: Link,
  activation: Zap,
  conv2d: Grid3x3,
  maxpool2d: Minimize2,
  flatten: AlignJustify,
  dropout: Scissors,
  batchnorm: BarChart3,
  lstm: GitBranch,
  embedding: Hash,
};

const CustomNode = ({ id, data, selected }) => {
  const Icon = ICON_MAP[data.type] || Link;
  const layerInfo = LAYER_INFO[data.type] || {};
  const removeNode = useBuilderStore((s) => s.removeNode);

  const paramSummary = () => {
    const p = data.params || {};
    switch (data.type) {
      case 'input': return `Shape: ${p.shape || '(28, 28, 1)'}`;
      case 'dense': return `Units: ${p.units || 64}${p.activation ? ` · ${p.activation}` : ''}`;
      case 'conv2d': return `${p.filters || 32} filters · ${p.kernel_size || '(3,3)'}`;
      case 'maxpool2d': return `Pool: ${p.pool_size || '(2,2)'}`;
      case 'dropout': return `Rate: ${p.rate ?? 0.25}`;
      case 'activation': return p.function || 'relu';
      case 'lstm': return `Units: ${p.units || 128}`;
      case 'embedding': return `${p.input_dim || 10000} → ${p.output_dim || 128}`;
      case 'batchnorm': return 'Normalize';
      case 'flatten': return 'Reshape to 1D';
      case 'output': return 'Predictions';
      default: return '';
    }
  };

  return (
    <div
      className={`custom-node ${selected ? 'selected' : ''}`}
      style={{
        borderColor: selected ? layerInfo.color : 'var(--node-border)',
        '--node-accent': layerInfo.color || '#6366f1',
      }}
    >
      {data.type !== 'input' && (
        <Handle type="target" position={Position.Top} />
      )}

      <div className="node-accent-bar" style={{ background: layerInfo.color || '#6366f1' }} />

      <div className="node-header">
        <div className="node-icon" style={{ background: layerInfo.bgColor, color: layerInfo.color }}>
          <Icon size={14} />
        </div>
        <span className="node-label">{data.label}</span>
        <button
          className="node-remove"
          onClick={(e) => { e.stopPropagation(); removeNode(id); }}
          title="Remove layer"
        >
          <X size={12} />
        </button>
      </div>

      <div className="node-params">{paramSummary()}</div>

      {data.type !== 'output' && (
        <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  );
};

export default CustomNode;
