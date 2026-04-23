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
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-heading font-bold text-white mb-2">Deploy Model</h2>
        <p className="text-dim text-sm">Deploy your trained model as an API endpoint for predictions</p>
      </div>

      {!activeDeployment ? (
        <div className="animate-fade-in-up">
          <div className="glass-panel rounded-3xl border border-white/10 p-16 text-center flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background glowing effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="w-24 h-24 rounded-3xl bg-cyan/10 text-cyan flex items-center justify-center mb-8 relative z-10 shadow-[0_0_50px_rgba(0,242,255,0.2)] border border-cyan/20">
              <Rocket size={48} className="animate-pulse" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-4 relative z-10">Ready to Deploy</h3>
            
            <p className="text-dim mb-10 max-w-md mx-auto leading-relaxed relative z-10">
              {trainingStatus === 'completed'
                ? `Model ${modelId || ''} is trained and ready. Deploy it to create an instant prediction API with a unique access key.`
                : 'Train your model first, then come back here to deploy it as a production-ready API.'}
            </p>
            
            <button
              className={`relative z-10 px-8 py-4 rounded-xl font-bold font-mono text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all ${
                deploying || trainingStatus !== 'completed'
                  ? 'bg-white/5 text-dim cursor-not-allowed border border-white/10'
                  : 'bg-cyan text-black hover:bg-cyan/90 shadow-[0_0_30px_rgba(0,242,255,0.3)] hover:-translate-y-1'
              }`}
              onClick={handleDeploy}
              disabled={deploying || trainingStatus !== 'completed'}
            >
              {deploying ? <><Loader2 size={18} className="animate-spin" /> Deploying Model...</> : <><Rocket size={18} /> Initialize Deployment</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in-up">
          {/* Status Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center mb-3 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                <Globe size={24} />
              </div>
              <div className="text-xs text-dim font-mono uppercase tracking-wider mb-1">Status</div>
              <div className="text-lg font-bold text-green-400">ACTIVE</div>
            </div>
            
            <div className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-violet/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-12 h-12 rounded-xl bg-violet/10 text-violet flex items-center justify-center mb-3 border border-violet/20 shadow-[0_0_15px_rgba(138,43,226,0.1)]">
                <Activity size={24} />
              </div>
              <div className="text-xs text-dim font-mono uppercase tracking-wider mb-1">Accuracy</div>
              <div className="text-lg font-bold text-white">{(activeDeployment.accuracy * 100).toFixed(1)}%</div>
            </div>
            
            <div className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-12 h-12 rounded-xl bg-cyan/10 text-cyan flex items-center justify-center mb-3 border border-cyan/20 shadow-[0_0_15px_rgba(0,242,255,0.1)]">
                <Server size={24} />
              </div>
              <div className="text-xs text-dim font-mono uppercase tracking-wider mb-1">Model ID</div>
              <div className="text-lg font-bold text-white font-mono">{activeDeployment.model_id.substring(0,8)}</div>
            </div>
          </div>

          {/* Endpoint Configuration */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3 uppercase tracking-wider">
                <Globe size={18} className="text-cyan" /> API Endpoint
              </h4>
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#0B0B0F] border border-white/10">
                <code className="text-sm font-mono text-cyan break-all mr-4">
                  <span className="text-dim select-none mr-2">POST</span>
                  {activeDeployment.endpoint_url}
                </code>
                <button 
                  className={`p-2 rounded-lg shrink-0 transition-colors ${copiedUrl ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-dim hover:bg-white/10 hover:text-white'}`}
                  onClick={() => copyToClipboard(activeDeployment.endpoint_url, 'url')}
                  title="Copy URL"
                >
                  {copiedUrl ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3 uppercase tracking-wider">
                <Key size={18} className="text-acid" /> API Key
              </h4>
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#0B0B0F] border border-white/10">
                <code className="text-sm font-mono text-white break-all mr-4">{activeDeployment.api_key}</code>
                <button 
                  className={`p-2 rounded-lg shrink-0 transition-colors ${copiedKey ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-dim hover:bg-white/10 hover:text-white'}`}
                  onClick={() => copyToClipboard(activeDeployment.api_key, 'key')}
                  title="Copy API Key"
                >
                  {copiedKey ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <p className="flex items-center gap-2 text-xs text-orange-300/80 mt-3 font-mono">
                <Shield size={14} /> Keep this key secret. Include it as the X-API-Key header in requests.
              </p>
            </div>
          </div>

          {/* Integration Snippets */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <Code size={18} className="text-violet" /> Integration Snippets
              </h4>
              <div className="flex bg-[#0B0B0F] p-1 rounded-lg border border-white/5">
                {['python', 'curl', 'javascript'].map((lang) => (
                  <button
                    key={lang}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-colors ${
                      activeSnippet === lang ? 'bg-white/10 text-white' : 'text-dim hover:text-white/80'
                    }`}
                    onClick={() => setActiveSnippet(lang)}
                  >
                    {lang === 'python' ? 'Python' : lang === 'curl' ? 'cURL' : 'JavaScript'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="relative group">
              <pre className="bg-[#050508] p-5 rounded-xl border border-white/5 text-xs font-mono leading-relaxed text-dim overflow-x-auto select-text">
                {snippets[activeSnippet]}
              </pre>
              <button
                className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all shadow-lg backdrop-blur-sm"
                onClick={() => { navigator.clipboard.writeText(snippets[activeSnippet]); toast.success('Code copied!'); }}
                title="Copy snippet"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeployPanel;
