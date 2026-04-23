import React, { useState, useEffect } from 'react';
import { useDeployStore, useTrainingStore, useDatasetStore } from '../../store/store';
import { deploymentApi } from '../../services/api';
import {
  Send, Clock, CheckCircle2, AlertCircle, Terminal, Code2, Loader2,
  RefreshCw, Eye, EyeOff, Zap, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

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
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white mb-2">API Playground</h2>
          <p className="text-dim text-sm">Test your deployed model with live inference</p>
        </div>
        {activeDeployment && (
          <button
            className={`px-4 py-2 rounded-xl text-sm font-mono font-bold transition-all ${
              manualMode ? 'bg-cyan text-black hover:bg-cyan/90 shadow-[0_0_15px_rgba(0,242,255,0.3)]' : 'bg-white/5 text-dim border border-white/10 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => setManualMode(m => !m)}
            title="Toggle manual credential entry"
          >
            {manualMode ? 'Use Deployment' : 'Enter Manually'}
          </button>
        )}
      </div>

      {/* Connection info bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 animate-fade-in-up">
        {manualMode ? (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="block text-xs font-mono text-dim uppercase tracking-wider">Model ID</label>
              <input
                className="w-full bg-[#12121A] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
                placeholder="e.g. a1b2c3d4"
                value={manualModelId}
                onChange={e => setManualModelId(e.target.value)}
              />
            </div>
            <div className="flex-[2] space-y-1.5">
              <label className="block text-xs font-mono text-dim uppercase tracking-wider">API Key</label>
              <div className="relative">
                <input
                  className="w-full bg-[#12121A] border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm font-mono text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
                  type={showKey ? 'text' : 'password'}
                  placeholder="ll_xxxxxxxxxxxx"
                  value={manualApiKey}
                  onChange={e => setManualApiKey(e.target.value)}
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-dim hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setShowKey(s => !s)}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        ) : activeDeployment ? (
          <div className="flex flex-wrap items-center gap-4 text-sm font-mono">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-bold">
              <CheckCircle2 size={14} /> Connected
            </span>
            <span className="text-dim">
              Model: <strong className="text-white bg-[#0B0B0F] px-2 py-1 rounded border border-white/5">{activeDeployment.model_id}</strong>
            </span>
            <span className="text-dim">
              Key: <span className="text-white bg-[#0B0B0F] px-2 py-1 rounded border border-white/5">{activeDeployment.api_key?.substring(0, 16)}...</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-orange-400 font-mono">
            <AlertCircle size={16} />
            No active deployment found — enter credentials manually above.
          </div>
        )}
      </div>

      {/* Endpoint URL & Hint */}
      <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up">
        {effectiveModelId && (
          <div className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-[#12121A] border border-white/10 text-sm font-mono">
            <span className="text-cyan font-bold tracking-wider">POST</span>
            <code className="text-white break-all">{effectiveUrl}</code>
          </div>
        )}

        {activeDataset?.input_shape && (
          <div className="flex-[2] flex items-center justify-between p-3 rounded-xl bg-violet/5 border border-violet/20 text-sm">
            <div className="flex items-center gap-2 text-violet font-mono">
              <Info size={16} className="shrink-0" />
              <span>
                Dataset shape: <code className="text-white bg-[#0B0B0F] px-1.5 py-0.5 rounded border border-white/5 mx-1">{activeDataset.input_shape}</code> — sample input generated.
              </span>
            </div>
            <button 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet/10 text-violet hover:bg-violet/20 transition-colors font-mono text-xs font-bold" 
              onClick={handleRegenerateSample}
            >
              <RefreshCw size={12} /> REGENERATE
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up items-stretch min-h-[500px]">
        {/* Request panel */}
        <div className="glass-panel rounded-2xl border border-white/10 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#12121A]">
            <h4 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
              <Code2 size={18} className="text-acid" /> Request Body (JSON)
            </h4>
            <button className="flex items-center gap-1.5 text-dim hover:text-white transition-colors font-mono text-xs" onClick={handleRegenerateSample}>
              <RefreshCw size={14} /> Sample
            </button>
          </div>
          <textarea
            className="flex-1 w-full p-4 bg-[#050508] text-acid font-mono text-sm leading-relaxed resize-none focus:outline-none border-b border-white/5 scrollbar-thin"
            value={inputJson}
            onChange={e => setInputJson(e.target.value)}
            spellCheck={false}
            placeholder='{"input": [0.1, 0.5, ...]}'
          />
          <div className="p-4 bg-[#12121A]">
            <button
              className="w-full py-4 rounded-xl bg-acid text-black font-bold font-mono text-sm hover:bg-acid/90 shadow-[0_0_20px_rgba(204,255,0,0.2)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              onClick={handleSendRequest}
              disabled={loading || !effectiveModelId}
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin" /> RUNNING INFERENCE...</>
                : <><Zap size={18} /> SEND REQUEST</>
              }
            </button>
          </div>
        </div>

        {/* Response panel */}
        <div className="glass-panel rounded-2xl border border-white/10 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#12121A]">
            <h4 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
              <Terminal size={18} className="text-cyan" /> Response
            </h4>
            {statusCode && (
              <div className="flex gap-2 items-center font-mono text-xs font-bold">
                <span className={`flex items-center gap-1.5 px-2 py-1 rounded border ${statusCode === 200 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {statusCode === 200 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} {statusCode}
                </span>
                {responseTime && (
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">
                    <Clock size={12} /> {responseTime}ms
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-[#050508] relative">
            {response ? (
              <div className="p-4 space-y-4">
                {/* Nice prediction summary */}
                {response.predicted_class !== undefined && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-[#12121A] border border-white/5 flex flex-col">
                      <span className="text-xs text-dim font-mono uppercase tracking-wider mb-1">Predicted Class</span>
                      <span className="text-xl font-bold text-white">{response.predicted_class}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#12121A] border border-white/5 flex flex-col">
                      <span className="text-xs text-dim font-mono uppercase tracking-wider mb-1">Confidence</span>
                      <span className="text-xl font-bold text-cyan font-mono">
                        {(response.confidence * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#12121A] border border-white/5 flex flex-col">
                      <span className="text-xs text-dim font-mono uppercase tracking-wider mb-1">Inference Time</span>
                      <span className="text-xl font-bold text-white font-mono">{response.inference_time_ms}ms</span>
                    </div>
                  </div>
                )}
                {/* Full JSON */}
                <pre className="p-4 rounded-xl bg-[#12121A] border border-white/5 text-xs font-mono leading-relaxed text-cyan/80 overflow-x-auto select-text scrollbar-thin">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 text-dim flex items-center justify-center mb-4">
                  <Terminal size={32} />
                </div>
                <p className="text-white font-bold mb-1">Hit "Send Request" to run inference</p>
                <p className="text-xs text-dim font-mono">
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
