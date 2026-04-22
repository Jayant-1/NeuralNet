import React, { useState } from 'react';
import { useDeployStore } from '../../store/store';
import { deploymentApi } from '../../services/api';
import { Send, Clock, CheckCircle2, AlertCircle, Terminal, Code2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import './ApiPlayground.css';

const SAMPLE_INPUT = JSON.stringify({
  input: [[0.1, 0.5, 0.3, 0.7, 0.2, 0.9, 0.4, 0.6, 0.8, 0.1]],
}, null, 2);

const ApiPlayground = ({ projectId }) => {
  const { activeDeployment } = useDeployStore();
  const [inputJson, setInputJson] = useState(SAMPLE_INPUT);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState(null);
  const [statusCode, setStatusCode] = useState(null);

  const handleSendRequest = async () => {
    if (!activeDeployment) { toast.error('Deploy a model first'); return; }
    let parsedInput;
    try { parsedInput = JSON.parse(inputJson); } catch { toast.error('Invalid JSON input'); return; }
    setLoading(true); setResponse(null); setStatusCode(null); setResponseTime(null);
    const start = performance.now();
    try {
      const { data } = await deploymentApi.predict(activeDeployment.model_id, parsedInput, activeDeployment.api_key);
      setResponseTime((performance.now() - start).toFixed(0));
      setStatusCode(200);
      setResponse(data);
    } catch (err) {
      setResponseTime((performance.now() - start).toFixed(0));
      setStatusCode(err.response?.status || 500);
      setResponse({ error: err.response?.data?.detail || err.message || 'Request failed' });
    } finally { setLoading(false); }
  };

  return (
    <div className="feature-panel feature-panel-wide">
      <div className="panel-header animate-fade-in-up">
        <h2>API Playground</h2>
        <p>Test your deployed model with custom input data</p>
      </div>
      {!activeDeployment ? (
        <div className="empty-state animate-fade-in-up">
          <div className="empty-icon"><Terminal size={48} /></div>
          <h3>No deployment found</h3>
          <p>Deploy your trained model first, then test it here.</p>
        </div>
      ) : (
        <div className="playground-layout animate-fade-in-up">
          <div className="playground-panel">
            <div className="playground-panel-header">
              <h4><Code2 size={16} /> Request</h4>
              <span className="badge badge-primary">POST</span>
            </div>
            <div className="playground-url">
              <span className="playground-method">POST</span>
              <code>{activeDeployment.endpoint_url}</code>
            </div>
            <div className="playground-section">
              <label className="form-label">Headers</label>
              <div className="playground-header-item"><span>X-API-Key</span><code>{activeDeployment.api_key.substring(0, 20)}...</code></div>
              <div className="playground-header-item"><span>Content-Type</span><code>application/json</code></div>
            </div>
            <div className="playground-section" style={{ flex: 1 }}>
              <label className="form-label">Body (JSON)</label>
              <textarea className="playground-editor" value={inputJson} onChange={(e) => setInputJson(e.target.value)} spellCheck={false} />
            </div>
            <button className="btn btn-primary w-full" onClick={handleSendRequest} disabled={loading}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send Request</>}
            </button>
          </div>
          <div className="playground-panel">
            <div className="playground-panel-header">
              <h4><Terminal size={16} /> Response</h4>
              {statusCode && (
                <div className="flex gap-2 items-center">
                  <span className={`badge ${statusCode === 200 ? 'badge-green' : 'badge-red'}`}>
                    {statusCode === 200 ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />} {statusCode}
                  </span>
                  {responseTime && <span className="badge badge-blue"><Clock size={10} /> {responseTime}ms</span>}
                </div>
              )}
            </div>
            <div className="playground-response" style={{ flex: 1 }}>
              {response ? (
                <pre className="playground-json">{JSON.stringify(response, null, 2)}</pre>
              ) : (
                <div className="playground-empty"><Terminal size={32} /><p>Send a request to see the response</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiPlayground;
