import React, { useState, useEffect } from 'react';
import { useDeployStore, useTrainingStore, useDatasetStore } from '../../store/store';
import { deploymentApi } from '../../services/api';
import {
  Send, Clock, CheckCircle2, AlertCircle, Terminal, Code2, Loader2,
  RefreshCw, Eye, EyeOff, Zap, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import './ApiPlayground.css';

// Generate a sample input based on model's input shape
const generateSampleInput = (inputShape) => {
  if (!inputShape) return { input: Array(10).fill(0).map(() => parseFloat(Math.random().toFixed(3))) };

  const shapeStr = inputShape.toString().replace(/[\(\)\s]/g, '');
  const dims = shapeStr.split(',').map(Number).filter(n => !isNaN(n) && n > 0);

  const buildArray = (dims) => {
    if (dims.length === 0) return parseFloat(Math.random().toFixed(3));
    return Array(dims[0]).fill(null).map(() => buildArray(dims.slice(1)));
  };

  return { input: buildArray(dims) };
};

const ApiPlayground = ({ projectId }) => {
  const { activeDeployment } = useDeployStore();
  const { modelId } = useTrainingStore();
  const { activeDataset } = useDatasetStore();

  // Manual override fields (if deployment store lost on refresh)
  const [manualMode, setManualMode] = useState(false);
  const [manualModelId, setManualModelId] = useState('');
  const [manualApiKey, setManualApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const [inputJson, setInputJson] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState(null);
  const [statusCode, setStatusCode] = useState(null);

  // Determine effective deployment info
  const effectiveModelId = manualMode ? manualModelId : (activeDeployment?.model_id || '');
  const effectiveApiKey  = manualMode ? manualApiKey  : (activeDeployment?.api_key  || '');
  const effectiveUrl     = effectiveModelId ? `/api/predict/${effectiveModelId}` : '';

  // Auto-generate sample input when dataset info is available
  useEffect(() => {
    const shape = activeDataset?.input_shape;
    const sample = generateSampleInput(shape);
    setInputJson(JSON.stringify(sample, null, 2));
  }, [activeDataset]);

  // If no deployment in store, auto-switch to manual mode
  useEffect(() => {
    if (!activeDeployment) setManualMode(true);
  }, [activeDeployment]);

  const handleSendRequest = async () => {
    if (!effectiveModelId) { toast.error('Enter a Model ID first'); return; }
    if (!effectiveApiKey)  { toast.error('Enter an API key first'); return; }

    let parsedInput;
    try {
      parsedInput = JSON.parse(inputJson);
    } catch {
      toast.error('Invalid JSON — check your input format');
      return;
    }

    setLoading(true);
    setResponse(null);
    setStatusCode(null);
    setResponseTime(null);

    const start = performance.now();
    try {
      const { data } = await deploymentApi.predict(effectiveModelId, parsedInput, effectiveApiKey);
      setResponseTime((performance.now() - start).toFixed(0));
      setStatusCode(200);
      setResponse(data);
    } catch (err) {
      setResponseTime((performance.now() - start).toFixed(0));
      setStatusCode(err.response?.status || 500);
      setResponse({ error: err.response?.data?.detail || err.message || 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateSample = () => {
    const shape = activeDataset?.input_shape;
    const sample = generateSampleInput(shape);
    setInputJson(JSON.stringify(sample, null, 2));
  };

  return (
    <div className="feature-panel feature-panel-wide">
      <div className="panel-header animate-fade-in-up">
        <div>
          <h2>API Playground</h2>
          <p>Test your deployed model with live inference</p>
        </div>
        {activeDeployment && (
          <button
            className={`btn btn-sm ${manualMode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setManualMode(m => !m)}
            title="Toggle manual credential entry"
          >
            {manualMode ? 'Use Deployment' : 'Enter Manually'}
          </button>
        )}
      </div>

      {/* Connection info bar */}
      <div className="playground-info-bar animate-fade-in-up">
        {manualMode ? (
          <div className="playground-manual-fields">
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Model ID</label>
              <input
                className="form-input"
                style={{ fontFamily: 'monospace', fontSize: 13 }}
                placeholder="e.g. a1b2c3d4"
                value={manualModelId}
                onChange={e => setManualModelId(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
              <label className="form-label" style={{ fontSize: 11 }}>API Key</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontSize: 13, paddingRight: 36 }}
                  type={showKey ? 'text' : 'password'}
                  placeholder="ll_xxxxxxxxxxxx"
                  value={manualApiKey}
                  onChange={e => setManualApiKey(e.target.value)}
                />
                <button
                  className="btn-icon"
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                  onClick={() => setShowKey(s => !s)}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        ) : activeDeployment ? (
          <div className="playground-conn-info">
            <span className="badge badge-green" style={{ gap: 5 }}>
              <CheckCircle2 size={11} /> Connected
            </span>
            <code style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Model: <strong>{activeDeployment.model_id}</strong>
            </code>
            <code style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Key: {activeDeployment.api_key?.substring(0, 16)}...
            </code>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--accent-amber)' }}>
            <AlertCircle size={15} />
            No active deployment found — enter credentials manually above.
          </div>
        )}
      </div>

      {/* Endpoint URL */}
      {effectiveModelId && (
        <div className="playground-url animate-fade-in-up">
          <span className="playground-method">POST</span>
          <code>{effectiveUrl}</code>
        </div>
      )}

      {/* Input hint */}
      {activeDataset?.input_shape && (
        <div className="playground-hint animate-fade-in-up">
          <Info size={13} />
          <span>
            Dataset shape: <code>{activeDataset.input_shape}</code> — sample input generated to match.
            <button className="btn-link" onClick={handleRegenerateSample} style={{ marginLeft: 8 }}>
              <RefreshCw size={11} /> Regenerate
            </button>
          </span>
        </div>
      )}

      <div className="playground-layout animate-fade-in-up">
        {/* Request panel */}
        <div className="playground-panel">
          <div className="playground-panel-header">
            <h4><Code2 size={16} /> Request Body (JSON)</h4>
            <button className="btn btn-ghost btn-sm" onClick={handleRegenerateSample}>
              <RefreshCw size={13} /> Sample
            </button>
          </div>
          <textarea
            className="playground-editor"
            value={inputJson}
            onChange={e => setInputJson(e.target.value)}
            spellCheck={false}
            placeholder='{"input": [0.1, 0.5, ...]}'
          />
          <button
            className="btn btn-primary w-full"
            style={{ marginTop: 12 }}
            onClick={handleSendRequest}
            disabled={loading || !effectiveModelId}
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Running inference...</>
              : <><Zap size={16} /> Send Request</>
            }
          </button>
        </div>

        {/* Response panel */}
        <div className="playground-panel">
          <div className="playground-panel-header">
            <h4><Terminal size={16} /> Response</h4>
            {statusCode && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge ${statusCode === 200 ? 'badge-green' : 'badge-red'}`}>
                  {statusCode === 200 ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />} {statusCode}
                </span>
                {responseTime && (
                  <span className="badge badge-blue">
                    <Clock size={10} /> {responseTime}ms
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="playground-response">
            {response ? (
              <>
                {/* Nice prediction summary */}
                {response.predicted_class !== undefined && (
                  <div className="prediction-summary">
                    <div className="prediction-class">
                      <span className="prediction-label">Predicted Class</span>
                      <span className="prediction-value">{response.predicted_class}</span>
                    </div>
                    <div className="prediction-class">
                      <span className="prediction-label">Confidence</span>
                      <span className="prediction-value" style={{ color: 'var(--accent-green)' }}>
                        {(response.confidence * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="prediction-class">
                      <span className="prediction-label">Inference time</span>
                      <span className="prediction-value">{response.inference_time_ms}ms</span>
                    </div>
                  </div>
                )}
                {/* Full JSON */}
                <pre className="playground-json">{JSON.stringify(response, null, 2)}</pre>
              </>
            ) : (
              <div className="playground-empty">
                <Terminal size={32} />
                <p>Hit "Send Request" to run inference</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Make sure your input shape matches the model
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiPlayground;
