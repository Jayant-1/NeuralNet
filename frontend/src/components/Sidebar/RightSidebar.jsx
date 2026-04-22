import React, { useState } from 'react';
import { useBuilderStore } from '../../store/store';
import { LAYER_PARAMS, LAYER_INFO } from '../../utils/layerDefs';
import { Box, Download, Copy, Check, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import './RightSidebar.css';

const RightSidebar = ({ code = '', framework = 'keras', onFrameworkChange }) => {
  const [activeTab, setActiveTab] = useState('code');
  const [copied, setCopied] = useState(false);
  const { selectedNode, updateNodeData } = useBuilderStore();

  const lines = code.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model.py`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded model.py');
  };

  const handleParamChange = (key, value) => {
    if (!selectedNode) return;
    const newParams = { ...selectedNode.data.params, [key]: value };
    updateNodeData(selectedNode.id, { params: newParams });
  };

  const paramDefs = selectedNode ? (LAYER_PARAMS[selectedNode.data.type] || []) : [];
  const layerInfo = selectedNode ? LAYER_INFO[selectedNode.data.type] : null;

  return (
    <aside className="sidebar sidebar-right">
      <div className="right-sidebar">
        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 14 }}>
          <button
            className={`tab ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            <Box size={14} />
            Code
          </button>
          <button
            className={`tab ${activeTab === 'props' ? 'active' : ''}`}
            onClick={() => setActiveTab('props')}
          >
            <Settings2 size={14} />
            Properties
          </button>
        </div>

        {activeTab === 'code' ? (
          <>
            {/* Code header */}
            <div className="code-header">
              <div className="code-title">
                <span className="badge badge-green">
                  {framework === 'keras' ? 'Keras Sequential' : 'PyTorch Module'}
                </span>
              </div>
              <select
                className="form-select"
                value={framework}
                onChange={(e) => onFrameworkChange?.(e.target.value)}
                style={{ width: 'auto', padding: '4px 32px 4px 10px', fontSize: 12 }}
              >
                <option value="keras">Keras</option>
                <option value="pytorch">PyTorch</option>
              </select>
            </div>

            {/* Actions */}
            <div className="code-actions">
              <button className="btn btn-sm" onClick={handleDownload}>
                <Download size={14} />
                Download
              </button>
              <button className="btn btn-sm" onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Code block */}
            <div className="code-block-container">
              {lines.map((line, idx) => (
                <div key={idx} className="code-line">
                  <div className="line-number">{idx + 1}</div>
                  <div className={`line-content ${getLineClass(line)}`}>
                    {line || ' '}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Properties panel */
          <div className="props-panel">
            {selectedNode ? (
              <>
                <div className="props-header">
                  <div
                    className="props-color-dot"
                    style={{ background: layerInfo?.color || '#6366f1' }}
                  />
                  <div>
                    <h4>{selectedNode.data.label}</h4>
                    <span className="props-type">{selectedNode.data.type}</span>
                  </div>
                </div>

                {paramDefs.length > 0 ? (
                  <div className="props-fields">
                    {paramDefs.map((param) => (
                      <div key={param.key} className="form-group">
                        <label className="form-label">{param.label}</label>
                        {param.type === 'select' ? (
                          <select
                            className="form-select"
                            value={selectedNode.data.params?.[param.key] ?? ''}
                            onChange={(e) => handleParamChange(param.key, e.target.value)}
                          >
                            {param.options.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={param.type}
                            className="form-input"
                            placeholder={param.placeholder}
                            value={selectedNode.data.params?.[param.key] ?? ''}
                            onChange={(e) =>
                              handleParamChange(
                                param.key,
                                param.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                              )
                            }
                            min={param.min}
                            max={param.max}
                            step={param.step}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="props-empty">No configurable parameters for this layer.</p>
                )}
              </>
            ) : (
              <div className="props-empty-state">
                <Settings2 size={32} />
                <p>Select a node on the canvas to view and edit its properties.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

function getLineClass(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('#')) return 'code-comment';
  if (trimmed.startsWith('import') || trimmed.startsWith('from')) return 'code-keyword';
  if (trimmed.startsWith('class') || trimmed.startsWith('def')) return 'code-keyword';
  return '';
}

export default RightSidebar;
