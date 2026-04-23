import React, { useState, useRef, useEffect } from 'react';
import { useTrainingStore, useDatasetStore } from '../../store/store';
import { validateGraph, graphToJson } from '../../utils/graphToJson';
import { trainingApi } from '../../services/api';
import { Play, Loader2, AlertTriangle, Cpu, Gauge, Timer, Layers, StopCircle, Database, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TrainingConfig = ({ projectId, nodes, edges }) => {
  const { status, setStatus, setMetrics, setActiveJob, addMetricEpoch, setCompiledCode, setModelId } = useTrainingStore();
  const activeDataset = useDatasetStore((s) => s.activeDataset);
  const [config, setConfig] = useState({
    optimizer: 'adam',
    loss: 'categorical_crossentropy',
    epochs: 10,
    batch_size: 32,
    learning_rate: 0.001,
    validation_split: 0.2,
  });
  const [training, setTraining] = useState(false);
  const [errors, setErrors] = useState([]);
  const pollingRef = useRef(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleStartTraining = async () => {
    // Validate graph
    const validation = validateGraph(nodes, edges);
    if (!validation.valid) {
      setErrors(validation.errors);
      toast.error('Fix graph errors before training');
      return;
    }
    setErrors([]);
    setTraining(true);
    setStatus('running');
    setMetrics([]);

    try {
      // Convert graph to the format the backend expects
      const graphJson = graphToJson(nodes, edges);
      const graphData = {
        layers: graphJson.layers.map((l) => ({
          id: l.id,
          type: l.type,
          label: l.label,
          params: l.params,
        })),
        connections: graphJson.connections.map((c) => ({
          source: c.from,
          target: c.to,
        })),
      };

      // Start training via backend API
      const { data } = await trainingApi.start({
        project_id: projectId,
        optimizer: config.optimizer,
        loss: config.loss,
        epochs: config.epochs,
        batch_size: config.batch_size,
        learning_rate: config.learning_rate,
        validation_split: config.validation_split,
        graph_data: graphData,
      });

      const jobId = data.job_id;
      setActiveJob({ id: jobId, config, status: 'running', started_at: new Date().toISOString() });
      toast.success('Training started!');

      // Poll for metrics every 1s
      let previousMetricsCount = 0;
      pollingRef.current = setInterval(async () => {
        try {
          const { data: jobData } = await trainingApi.getMetrics(jobId);

          // Add only new metrics
          if (jobData.metrics && jobData.metrics.length > previousMetricsCount) {
            const newMetrics = jobData.metrics.slice(previousMetricsCount);
            newMetrics.forEach((m) => addMetricEpoch(m));
            previousMetricsCount = jobData.metrics.length;
          }

          // Check if training is done
          if (jobData.status === 'completed') {
            stopPolling();
            setStatus('completed');
            setTraining(false);
            if (jobData.compiled_code) setCompiledCode(jobData.compiled_code);
            if (jobData.model_id) setModelId(jobData.model_id);
            toast.success('Training completed!');
          } else if (jobData.status === 'failed') {
            stopPolling();
            setStatus('failed');
            setTraining(false);
            toast.error(jobData.error_message || 'Training failed');
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 1000);

    } catch (err) {
      setStatus('failed');
      setTraining(false);
      toast.error(err.response?.data?.detail || 'Failed to start training');
    }
  };

  const handleStopTraining = () => {
    stopPolling();
    setStatus('completed');
    setTraining(false);
    toast('Training stopped');
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-heading font-bold text-white mb-2">Training Configuration</h2>
        <p className="text-dim text-sm">Configure hyperparameters and start training your model</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
        <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-xl bg-violet/10 text-violet flex items-center justify-center mb-2"><Layers size={20} /></div>
          <div className="text-xs text-dim font-mono uppercase tracking-wider mb-1">Layers</div>
          <div className="text-xl font-bold text-white">{nodes.length}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-xl bg-orange-400/10 text-orange-400 flex items-center justify-center mb-2"><Timer size={20} /></div>
          <div className="text-xs text-dim font-mono uppercase tracking-wider mb-1">Epochs</div>
          <div className="text-xl font-bold text-white">{config.epochs}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-xl bg-acid/10 text-acid flex items-center justify-center mb-2"><Gauge size={20} /></div>
          <div className="text-xs text-dim font-mono uppercase tracking-wider mb-1">Learning Rate</div>
          <div className="text-xl font-bold text-white">{config.learning_rate}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 text-cyan flex items-center justify-center mb-2"><Database size={20} /></div>
          <div className="text-xs text-dim font-mono uppercase tracking-wider mb-1">Dataset</div>
          <div className="text-sm font-bold text-white truncate w-full px-2">
            {activeDataset?.name || 'Synthetic'}
          </div>
        </div>
      </div>

      {/* Active dataset info */}
      {activeDataset && activeDataset.active !== false && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 animate-fade-in-up">
          <CheckCircle2 size={18} className="text-green-400 shrink-0" />
          <span className="text-sm text-green-100 font-mono">
            Training with <strong className="text-green-400">{activeDataset.name}</strong> — {activeDataset.input_shape}, {activeDataset.num_classes} classes, {activeDataset.num_train?.toLocaleString()} samples
          </span>
        </div>
      )}

      {!activeDataset && (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-3 animate-fade-in-up">
          <AlertTriangle size={18} className="text-orange-400 shrink-0" />
          <span className="text-sm text-orange-200 font-mono">
            No dataset loaded — will use synthetic random data. Load a dataset from the Dataset tab for real training.
          </span>
        </div>
      )}

      {errors.length > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-fade-in-up">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-200 font-mono">
            {errors.map((err, i) => <p key={i} className="mb-1 last:mb-0">{err}</p>)}
          </div>
        </div>
      )}

      <div className="glass-panel p-6 rounded-2xl border border-white/10 animate-fade-in-up">
        <h3 className="text-lg font-bold text-white mb-6">Hyperparameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-dim">Optimizer</label>
            <select 
              className="w-full bg-[#12121A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
              value={config.optimizer} 
              onChange={(e) => handleChange('optimizer', e.target.value)}
            >
              <option value="adam">Adam</option>
              <option value="sgd">SGD</option>
              <option value="rmsprop">RMSprop</option>
              <option value="adamw">AdamW</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-dim">Loss Function</label>
            <select 
              className="w-full bg-[#12121A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
              value={config.loss} 
              onChange={(e) => handleChange('loss', e.target.value)}
            >
              <option value="categorical_crossentropy">Categorical Crossentropy</option>
              <option value="binary_crossentropy">Binary Crossentropy</option>
              <option value="mse">Mean Squared Error</option>
              <option value="mae">Mean Absolute Error</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-dim">Epochs</label>
            <input 
              type="number" 
              className="w-full bg-[#12121A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
              value={config.epochs} 
              onChange={(e) => handleChange('epochs', parseInt(e.target.value) || 1)} 
              min={1} max={1000} 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-dim">Batch Size</label>
            <select 
              className="w-full bg-[#12121A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
              value={config.batch_size} 
              onChange={(e) => handleChange('batch_size', parseInt(e.target.value))}
            >
              <option value="16">16</option>
              <option value="32">32</option>
              <option value="64">64</option>
              <option value="128">128</option>
              <option value="256">256</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-dim">Learning Rate</label>
            <input 
              type="number" 
              className="w-full bg-[#12121A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
              value={config.learning_rate} 
              onChange={(e) => handleChange('learning_rate', parseFloat(e.target.value) || 0.001)} 
              step={0.0001} min={0.00001} 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-dim">Validation Split</label>
            <input 
              type="number" 
              className="w-full bg-[#12121A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
              value={config.validation_split} 
              onChange={(e) => handleChange('validation_split', parseFloat(e.target.value) || 0.2)} 
              step={0.05} min={0} max={0.5} 
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 animate-fade-in-up pt-4">
        <button 
          className="flex-1 py-4 rounded-xl bg-cyan text-black font-bold font-mono text-sm hover:bg-cyan/90 hover:shadow-[0_0_30px_rgba(0,242,255,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleStartTraining} 
          disabled={training}
        >
          {training ? <><Loader2 size={18} className="animate-spin" /> INITIALIZING TRAINING...</> : <><Play size={18} /> START TRAINING</>}
        </button>
        {training && (
          <button 
            className="px-8 py-4 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 font-bold font-mono text-sm transition-all flex items-center justify-center gap-2"
            onClick={handleStopTraining}
          >
            <StopCircle size={18} /> STOP
          </button>
        )}
      </div>
    </div>
  );
};

export default TrainingConfig;
