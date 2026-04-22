import React, { useState } from 'react';
import { useTrainingStore, useDeployStore } from '../../store/store';
import { deploymentApi } from '../../services/api';
import { Rocket, Copy, Check, Globe, Key, Shield, Activity, Server, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const DeployPanel = ({ projectId }) => {
  const { status: trainingStatus, metrics } = useTrainingStore();
  const { activeDeployment, setActiveDeployment } = useDeployStore();
  const [deploying, setDeploying] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleDeploy = async () => {
    if (trainingStatus !== 'completed') {
      toast.error('Train a model first before deploying');
      return;
    }
    setDeploying(true);

    try {
      const { data } = await deploymentApi.deploy({
        project_id: projectId,
      });

      const deployment = {
        ...data,
        accuracy: metrics.length > 0 ? metrics[metrics.length - 1].val_acc : 0,
        created_at: new Date().toISOString(),
      };

      setActiveDeployment(deployment);
      toast.success('Model deployed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Deployment failed');
    } finally {
      setDeploying(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
    toast.success('Copied!');
  };

  return (
    <div className="feature-panel">
      <div className="panel-header animate-fade-in-up">
        <h2>Deploy Model</h2>
        <p>Deploy your trained model as an API endpoint for predictions</p>
      </div>

      {!activeDeployment ? (
        <div className="animate-fade-in-up">
          <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <div className="empty-icon" style={{ margin: '0 auto 16px' }}>
              <Rocket size={40} />
            </div>
            <h3 style={{ marginBottom: 8 }}>Ready to Deploy</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
              {trainingStatus === 'completed'
                ? 'Your model is trained and ready. Deploy it to create a prediction API endpoint.'
                : 'Train your model first, then come back here to deploy it as an API.'}
            </p>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleDeploy}
              disabled={deploying || trainingStatus !== 'completed'}
            >
              {deploying ? <><Loader2 size={18} className="animate-spin" /> Deploying...</> : <><Rocket size={18} /> Deploy Model</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Status */}
          <div className="metrics-row">
            <div className="metric-card">
              <div className="metric-card-icon" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>
                <Globe size={18} />
              </div>
              <div className="metric-card-label">Status</div>
              <div className="metric-card-value" style={{ color: 'var(--accent-green)' }}>Active</div>
            </div>
            <div className="metric-card">
              <div className="metric-card-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary-color)' }}>
                <Activity size={18} />
              </div>
              <div className="metric-card-label">Accuracy</div>
              <div className="metric-card-value">{(activeDeployment.accuracy * 100).toFixed(1)}%</div>
            </div>
            <div className="metric-card">
              <div className="metric-card-icon" style={{ background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)' }}>
                <Server size={18} />
              </div>
              <div className="metric-card-label">Model ID</div>
              <div className="metric-card-value" style={{ fontSize: '0.9rem' }}>{activeDeployment.model_id}</div>
            </div>
          </div>

          {/* Endpoint */}
          <div className="card">
            <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={16} style={{ color: 'var(--accent-green)' }} /> API Endpoint
            </h4>
            <div className="deploy-field">
              <code className="deploy-value">{`POST ${activeDeployment.endpoint_url}`}</code>
              <button className="btn btn-sm" onClick={() => copyToClipboard(activeDeployment.endpoint_url, 'url')}>
                {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* API Key */}
          <div className="card">
            <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={16} style={{ color: 'var(--accent-amber)' }} /> API Key
            </h4>
            <div className="deploy-field">
              <code className="deploy-value mono">{activeDeployment.api_key}</code>
              <button className="btn btn-sm" onClick={() => copyToClipboard(activeDeployment.api_key, 'key')}>
                {copiedKey ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={12} /> Keep this key secret. Include it as X-API-Key header.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeployPanel;
