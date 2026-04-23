import React, { useState } from 'react';
import { useTrainingStore, useDeployStore } from '../../store/store';
import { deploymentApi } from '../../services/api';
import { Rocket, Copy, Check, Globe, Key, Shield, Activity, Server, Loader2, Code, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';

const DeployPanel = ({ projectId }) => {
  const { status: trainingStatus, metrics, modelId } = useTrainingStore();
  const { activeDeployment, setActiveDeployment } = useDeployStore();
  const [deploying, setDeploying] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState('python');

  const handleDeploy = async () => {
    if (trainingStatus !== 'completed') {
      toast.error('Train a model first before deploying');
      return;
    }
    setDeploying(true);

    try {
      const { data } = await deploymentApi.deploy({
        project_id: projectId,
        model_id: modelId,
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

  const getCodeSnippets = () => {
    if (!activeDeployment) return {};
    const url = activeDeployment.endpoint_url;
    const key = activeDeployment.api_key;

    return {
      python: `import requests
import numpy as np

url = "${url}"
headers = {"X-API-Key": "${key}"}

# Example: random input matching model shape
data = {"input": np.random.randn(28, 28, 1).tolist()}

response = requests.post(url, json=data, headers=headers)
result = response.json()

print(f"Predicted class: {result['predicted_class']}")
print(f"Confidence: {result['confidence']:.4f}")`,

      curl: `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${key}" \\
  -d '{"input": [[0.5, 0.3, 0.1, 0.8, 0.2, 0.9, 0.4, 0.7, 0.6, 0.5]]}'`,

      javascript: `const response = await fetch("${url}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "${key}",
  },
  body: JSON.stringify({
    input: Array.from({length: 784}, () => Math.random()),
  }),
});

const result = await response.json();
console.log("Predicted class:", result.predicted_class);
console.log("Confidence:", result.confidence);`,
    };
  };

  const snippets = getCodeSnippets();

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
                ? `Model ${modelId || ''} is trained and ready. Deploy it to create a prediction API.`
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

          {/* Code Snippets */}
          <div className="card">
            <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Code size={16} style={{ color: 'var(--primary-color)' }} /> Integration Code
            </h4>
            <div className="tabs" style={{ marginBottom: 14 }}>
              {['python', 'curl', 'javascript'].map((lang) => (
                <button
                  key={lang}
                  className={`tab ${activeSnippet === lang ? 'active' : ''}`}
                  onClick={() => setActiveSnippet(lang)}
                >
                  {lang === 'python' ? 'Python' : lang === 'curl' ? 'cURL' : 'JavaScript'}
                </button>
              ))}
            </div>
            <pre style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              padding: 16,
              fontSize: 12,
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--text-secondary)',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
            }}>
              {snippets[activeSnippet]}
            </pre>
            <button
              className="btn btn-sm"
              style={{ marginTop: 10 }}
              onClick={() => { navigator.clipboard.writeText(snippets[activeSnippet]); toast.success('Code copied!'); }}
            >
              <Copy size={14} /> Copy Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeployPanel;
