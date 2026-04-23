import React, { useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { LAYER_INFO, LAYER_PARAMS } from '../../utils/layerDefs';
import {
  ArrowDownToLine, ArrowUpFromLine, Link, Zap, Grid3x3,
  Minimize2, AlignJustify, Scissors, BarChart3, GitBranch, Hash, X
} from 'lucide-react';
import { useBuilderStore } from '../../store/store';

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

  const renderField = (param) => {
    const val = data.params?.[param.key] ?? '';

    if (param.type === 'select') {
      return (
        <select
          className="flex-1 min-w-0 bg-[#0B0B0F] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all cursor-pointer"
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
        className="flex-1 min-w-0 bg-[#0B0B0F] border border-white/5 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all placeholder:text-white/20"
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
      className={`glass-panel w-56 flex flex-col relative rounded-2xl border transition-all duration-300 group ${
        selected ? 'shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10' : 'shadow-xl z-0'
      }`}
      style={{
        borderColor: selected ? layerInfo.color : 'rgba(255,255,255,0.08)',
        boxShadow: selected ? `0 0 20px ${layerInfo.color}33, inset 0 0 10px ${layerInfo.color}11` : undefined,
      }}
    >
      {data.type !== 'input' && (
        <Handle 
          type="target" 
          position={Position.Top} 
          className="!w-3 !h-3 !border-2 !border-[#12121A] !rounded-full transition-all"
          style={{ background: layerInfo.color || '#6366f1', top: '-6px' }}
        />
      )}

      {/* Top Accent line */}
      <div className="h-1 w-full shrink-0 rounded-t-2xl" style={{ background: layerInfo.color || '#6366f1' }} />

      <div className="flex items-center gap-3 p-3 pb-2 relative">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" 
          style={{ background: layerInfo.bgColor, color: layerInfo.color }}
        >
          <Icon size={16} />
        </div>
        <span className="font-heading font-bold text-white text-sm flex-1 truncate pr-6">{data.label}</span>
        
        <button
          className="absolute right-2 top-3 p-1.5 text-dim hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); removeNode(id); }}
          title="Remove layer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Inline editable params */}
      {paramDefs.length > 0 && (
        <div className="px-3 pb-4 flex flex-col gap-2">
          {paramDefs.map((param) => (
            <div key={param.key} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-dim uppercase tracking-wider w-16 shrink-0 truncate" title={param.label}>
                {param.label}
              </span>
              {renderField(param)}
            </div>
          ))}
        </div>
      )}

      {paramDefs.length === 0 && (
        <div className="px-3 pb-4 text-[10px] font-mono text-dim/50 uppercase tracking-wider pl-13">
          {data.type === 'flatten' ? 'Reshape to 1D' : data.type === 'batchnorm' ? 'Normalize' : 'No params'}
        </div>
      )}

      {data.type !== 'output' && (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="!w-3 !h-3 !border-2 !border-[#12121A] !rounded-full transition-all"
          style={{ background: layerInfo.color || '#00F2FF', bottom: '-6px' }}
        />
      )}
    </div>
  );
};

export default CustomNode;
