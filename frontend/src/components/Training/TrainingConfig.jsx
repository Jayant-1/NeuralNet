import React, { useState, useRef, useEffect } from 'react';
import { useTrainingStore } from '../../store/store';
import { validateGraph, graphToJson } from '../../utils/graphToJson';
import { trainingApi } from '../../services/api';
import { Play, Loader2, AlertTriangle, Cpu, Gauge, Timer, Layers, StopCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import './TrainingConfig.css';

const TrainingConfig = ({ projectId, nodes, edges }) => {
  const { status, setStatus, setMetrics, setActiveJob, addMetricEpoch } = useTrainingStore();
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
    <div className="feature-panel">
      <div className="panel-header animate-fade-in-up">
        <h2>Training Configuration</h2>
        <p>Configure hyperparameters and start training your model</p>
      </div>

      <div className="metrics-row animate-fade-in-up">
        <div className="metric-card">
          <div className="metric-card-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary-color)' }}><Layers size={18} /></div>
          <div className="metric-card-label">Layers</div>
          <div className="metric-card-value">{nodes.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-icon" style={{ background: 'var(--accent-amber-bg)', color: 'var(--accent-amber)' }}><Timer size={18} /></div>
          <div className="metric-card-label">Epochs</div>
          <div className="metric-card-value">{config.epochs}</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-icon" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}><Gauge size={18} /></div>
          <div className="metric-card-label">Learning Rate</div>
          <div className="metric-card-value">{config.learning_rate}</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-icon" style={{ background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)' }}><Cpu size={18} /></div>
          <div className="metric-card-label">Batch Size</div>
          <div className="metric-card-value">{config.batch_size}</div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="training-errors animate-fade-in-up">
          <AlertTriangle size={16} />
          <div>{errors.map((err, i) => <p key={i}>{err}</p>)}</div>
        </div>
      )}

      <div className="card animate-fade-in-up" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 20 }}>Hyperparameters</h3>
        <div className="config-form">
          <div className="config-form-row">
            <div className="form-group">
              <label className="form-label">Optimizer</label>
              <select className="form-select" value={config.optimizer} onChange={(e) => handleChange('optimizer', e.target.value)}>
                <option value="adam">Adam</option>
                <option value="sgd">SGD</option>
                <option value="rmsprop">RMSprop</option>
                <option value="adamw">AdamW</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Loss Function</label>
              <select className="form-select" value={config.loss} onChange={(e) => handleChange('loss', e.target.value)}>
                <option value="categorical_crossentropy">Categorical Crossentropy</option>
                <option value="binary_crossentropy">Binary Crossentropy</option>
                <option value="mse">Mean Squared Error</option>
                <option value="mae">Mean Absolute Error</option>
              </select>
            </div>
          </div>
          <div className="config-form-row">
            <div className="form-group">
              <label className="form-label">Epochs</label>
              <input type="number" className="form-input" value={config.epochs} onChange={(e) => handleChange('epochs', parseInt(e.target.value) || 1)} min={1} max={1000} />
            </div>
            <div className="form-group">
              <label className="form-label">Batch Size</label>
              <select className="form-select" value={config.batch_size} onChange={(e) => handleChange('batch_size', parseInt(e.target.value))}>
                <option value="16">16</option>
                <option value="32">32</option>
                <option value="64">64</option>
                <option value="128">128</option>
                <option value="256">256</option>
              </select>
            </div>
          </div>
          <div className="config-form-row">
            <div className="form-group">
              <label className="form-label">Learning Rate</label>
              <input type="number" className="form-input" value={config.learning_rate} onChange={(e) => handleChange('learning_rate', parseFloat(e.target.value) || 0.001)} step={0.0001} min={0.00001} />
            </div>
            <div className="form-group">
              <label className="form-label">Validation Split</label>
              <input type="number" className="form-input" value={config.validation_split} onChange={(e) => handleChange('validation_split', parseFloat(e.target.value) || 0.2)} step={0.05} min={0} max={0.5} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 animate-fade-in-up">
        <button className="btn btn-primary btn-lg w-full" onClick={handleStartTraining} disabled={training}>
          {training ? <><Loader2 size={18} className="animate-spin" /> Training...</> : <><Play size={18} /> Start Training</>}
        </button>
        {training && (
          <button className="btn btn-danger btn-lg" onClick={handleStopTraining} style={{ flexShrink: 0 }}>
            <StopCircle size={18} /> Stop
          </button>
        )}
      </div>
    </div>
  );
};

export default TrainingConfig;
