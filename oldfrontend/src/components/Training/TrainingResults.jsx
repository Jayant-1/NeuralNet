import React from 'react';
import { useTrainingStore } from '../../store/store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, Activity, CheckCircle2, Code, FileText, Table } from 'lucide-react';

const TrainingResults = ({ projectId }) => {
  const { metrics, status, compiledCode, modelSummary, modelId } = useTrainingStore();

  const lastMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;

  const statusBadge = {
    idle: { class: 'status-idle', label: 'Not Started' },
    running: { class: 'status-running', label: 'Training...' },
    completed: { class: 'status-completed', label: 'Completed' },
    failed: { class: 'status-failed', label: 'Failed' },
  };
  const st = statusBadge[status] || statusBadge.idle;

  return (
    <div className="feature-panel feature-panel-wide">
      <div className="panel-header animate-fade-in-up">
        <div className="flex justify-between items-center w-full">
          <div>
            <h2>Training Results</h2>
            <p>Monitor accuracy and loss metrics across epochs</p>
          </div>
          <div className="flex gap-2 items-center">
            {modelId && <span className="badge badge-primary">Model: {modelId}</span>}
            <span className={`badge ${st.class}`}>{st.label}</span>
          </div>
        </div>
      </div>

      {lastMetric && (
        <div className="metrics-row animate-fade-in-up">
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>
              <TrendingUp size={18} />
            </div>
            <div className="metric-card-label">Train Accuracy</div>
            <div className="metric-card-value">{(lastMetric.train_acc * 100).toFixed(1)}%</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>
              <CheckCircle2 size={18} />
            </div>
            <div className="metric-card-label">Val Accuracy</div>
            <div className="metric-card-value">{(lastMetric.val_acc * 100).toFixed(1)}%</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>
              <TrendingDown size={18} />
            </div>
            <div className="metric-card-label">Train Loss</div>
            <div className="metric-card-value">{lastMetric.train_loss}</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: 'var(--accent-amber-bg)', color: 'var(--accent-amber)' }}>
              <Activity size={18} />
            </div>
            <div className="metric-card-label">Val Loss</div>
            <div className="metric-card-value">{lastMetric.val_loss}</div>
          </div>
        </div>
      )}

      {metrics.length > 0 ? (
        <div className="animate-fade-in-up">
          {/* Accuracy Chart */}
          <div className="chart-container">
            <div className="chart-title">Accuracy per Epoch</div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="accGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="accGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="epoch" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 1]} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend />
                <Area type="monotone" dataKey="train_acc" stroke="#6366f1" fill="url(#accGrad1)" strokeWidth={2} name="Train Acc" dot={false} />
                <Area type="monotone" dataKey="val_acc" stroke="#10b981" fill="url(#accGrad2)" strokeWidth={2} name="Val Acc" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Loss Chart */}
          <div className="chart-container">
            <div className="chart-title">Loss per Epoch</div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="lossGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lossGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="epoch" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend />
                <Area type="monotone" dataKey="train_loss" stroke="#ef4444" fill="url(#lossGrad1)" strokeWidth={2} name="Train Loss" dot={false} />
                <Area type="monotone" dataKey="val_loss" stroke="#f59e0b" fill="url(#lossGrad2)" strokeWidth={2} name="Val Loss" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Epoch History Table */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Table size={16} /> Training History
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Epoch</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Train Loss</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Val Loss</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Train Acc</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Val Acc</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.epoch} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{m.epoch}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{m.train_loss}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{m.val_loss}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-green)' }}>{(m.train_acc * 100).toFixed(1)}%</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-blue)' }}>{(m.val_acc * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Generated Code */}
          {compiledCode && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Code size={16} style={{ color: 'var(--primary-color)' }} /> Generated Keras Code (AST)
              </h4>
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
                {compiledCode}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state animate-fade-in-up">
          <div className="empty-icon"><BarChart3 size={48} /></div>
          <h3>No training data yet</h3>
          <p>Start training from the Training tab to see metrics here.</p>
        </div>
      )}
    </div>
  );
};

export default TrainingResults;
