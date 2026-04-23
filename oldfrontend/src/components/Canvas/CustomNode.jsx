import React, { useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { LAYER_INFO, LAYER_PARAMS } from '../../utils/layerDefs';
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
  const updateNodeData = useBuilderStore((s) => s.updateNodeData);
  const paramDefs = LAYER_PARAMS[data.type] || [];

  const handleParamChange = useCallback(
    (key, value) => {
      updateNodeData(id, { params: { ...data.params, [key]: value } });
    },
    [id, data.params, updateNodeData]
  );

  // Render an inline field based on param definition
  const renderField = (param) => {
    const val = data.params?.[param.key] ?? '';

    if (param.type === 'select') {
      return (
        <select
          className="node-inline-select"
          value={val}
          onChange={(e) => handleParamChange(param.key, e.target.value)}
          onClick={(e) => e.stopPropagation()}
        >
          {(param.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        className="node-inline-input"
        type={param.type === 'number' ? 'number' : 'text'}
        value={val}
        placeholder={param.placeholder || ''}
        min={param.min}
        max={param.max}
        step={param.step}
        onChange={(e) => {
          const v = param.type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value;
          handleParamChange(param.key, v);
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
    );
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

      {/* Inline editable params */}
      {paramDefs.length > 0 && (
        <div className="node-inline-params">
          {paramDefs.map((param) => (
            <div key={param.key} className="node-param-row">
              <span className="node-param-label">{param.label}</span>
              {renderField(param)}
            </div>
          ))}
        </div>
      )}

      {/* Fallback summary for layers with no params */}
      {paramDefs.length === 0 && (
        <div className="node-params">
          {data.type === 'flatten' ? 'Reshape to 1D' : data.type === 'batchnorm' ? 'Normalize' : ''}
        </div>
      )}

      {data.type !== 'output' && (
        <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  );
};

export default CustomNode;
