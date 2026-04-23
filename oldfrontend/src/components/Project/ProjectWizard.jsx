import React, { useState } from 'react';
import {
  X, ArrowRight, ArrowLeft, Image, Table, Type, Brain,
  TrendingUp, Tag, Layers, Plus, ScanLine, GitBranch, Check
} from 'lucide-react';

// ─── Step data ──────────────────────────────────────────────────
const PROBLEM_TYPES = [
  {
    key: 'image_classification',
    label: 'Image Classification',
    desc: 'Classify images into categories (cats/dogs, MNIST, CIFAR)',
    icon: Image,
    color: '#a855f7',
    inputType: 'image',
    defaults: {
      normalize_pixels: true,
      one_hot_encode: true,
      random_flip: false,
      random_zoom: false,
      standardize: false,
      fill_na_mean: false,
    },
    suggestedTemplate: 'cnn',
    suggestedLoss: 'categorical_crossentropy',
  },
  {
    key: 'tabular_classification',
    label: 'Tabular Classification',
    desc: 'Classify rows in a CSV or structured dataset',
    icon: Table,
    color: '#6366f1',
    inputType: 'tabular',
    defaults: {
      normalize_pixels: false,
      one_hot_encode: true,
      standardize: true,
      fill_na_mean: true,
      random_flip: false,
      random_zoom: false,
    },
    suggestedTemplate: 'mlp',
    suggestedLoss: 'categorical_crossentropy',
  },
  {
    key: 'regression',
    label: 'Regression',
    desc: 'Predict continuous numerical values',
    icon: TrendingUp,
    color: '#10b981',
    inputType: 'tabular',
    defaults: {
      normalize_pixels: false,
      one_hot_encode: false,
      standardize: true,
      fill_na_mean: true,
      random_flip: false,
      random_zoom: false,
    },
    suggestedTemplate: 'mlp',
    suggestedLoss: 'mse',
  },
  {
    key: 'nlp',
    label: 'Text / NLP',
    desc: 'Sentiment analysis, text classification',
    icon: Type,
    color: '#06b6d4',
    inputType: 'text',
    defaults: {
      normalize_pixels: false,
      one_hot_encode: false,
      standardize: false,
      fill_na_mean: false,
      random_flip: false,
      random_zoom: false,
    },
    suggestedTemplate: 'rnn',
    suggestedLoss: 'binary_crossentropy',
  },
  {
    key: 'custom',
    label: 'Custom / Other',
    desc: 'I know what I\'m doing — start blank',
    icon: Brain,
    color: '#f59e0b',
    inputType: 'tabular',
    defaults: {},
    suggestedTemplate: '',
    suggestedLoss: 'categorical_crossentropy',
  },
];

const LABEL_TYPES = [
  { key: 'multi_class', label: 'Multi-class', desc: 'One label from many (e.g. digit 0-9)', icon: Tag },
  { key: 'binary', label: 'Binary', desc: 'Yes/No, True/False, 0 or 1', icon: Check },
  { key: 'continuous', label: 'Continuous', desc: 'A number (regression output)', icon: TrendingUp },
  { key: 'already_preprocessed', label: 'Already preprocessed', desc: 'My data is ready as-is', icon: Check },
];

// ─── Wizard Component ────────────────────────────────────────────
const ProjectWizard = ({ onClose, onCreate, loading }) => {
  const [step, setStep] = useState(1); // 1=Problem, 2=Labels, 3=Details
  const [selected, setSelected] = useState({
    problemType: null,       // PROBLEM_TYPES key
    labelType: null,         // LABEL_TYPES key
    name: '',
    description: '',
    template: '',
    preprocessingConfig: {},
  });

  const problem = PROBLEM_TYPES.find(p => p.key === selected.problemType);

  const handleProblemSelect = (p) => {
    setSelected(prev => ({
      ...prev,
      problemType: p.key,
      template: p.suggestedTemplate,
      preprocessingConfig: { ...p.defaults },
    }));
  };

  const handleLabelSelect = (l) => {
    setSelected(prev => {
      const cfg = { ...prev.preprocessingConfig };
      // one_hot_encode only for multi-class
      cfg.one_hot_encode = l.key === 'multi_class';
      return { ...prev, labelType: l.key, preprocessingConfig: cfg };
    });
  };

  const handleCreate = () => {
    if (!selected.name.trim()) return;
    onCreate({
      name: selected.name,
      description: selected.description,
      template: selected.template || 'custom',
      problem_type: selected.problemType || 'custom',
      input_type: problem?.inputType || 'tabular',
      preprocessing_config: selected.preprocessingConfig,
    });
  };

  const canNext1 = !!selected.problemType;
  const canNext2 = !!selected.labelType;
  const canCreate = selected.name.trim().length > 0;

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal modal-wide animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 600 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <h2 className="modal-title">New Project</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Step {step} of 3 — {step === 1 ? 'Choose problem type' : step === 2 ? 'Describe your labels' : 'Name your project'}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: s <= step ? 'var(--primary-color)' : 'var(--border-color)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* ── Step 1: Problem Type ── */}
        {step === 1 && (
          <div>
            <div className="wizard-grid">
              {PROBLEM_TYPES.map(p => {
                const Icon = p.icon;
                const active = selected.problemType === p.key;
                return (
                  <div
                    key={p.key}
                    className={`wizard-option ${active ? 'wizard-option-active' : ''}`}
                    onClick={() => handleProblemSelect(p)}
                    style={{ borderColor: active ? p.color : undefined }}
                  >
                    <div className="wizard-option-icon" style={{
                      background: active ? `${p.color}22` : 'var(--bg-tertiary)',
                      color: p.color,
                    }}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <div className="wizard-option-label">{p.label}</div>
                      <div className="wizard-option-desc">{p.desc}</div>
                    </div>
                    {active && <Check size={16} style={{ color: p.color, marginLeft: 'auto', flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                className="btn btn-primary"
                onClick={() => setStep(2)}
                disabled={!canNext1}
              >
                Next <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Label / Output Type ── */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              What does your target/label look like?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {LABEL_TYPES.map(l => {
                const Icon = l.icon;
                const active = selected.labelType === l.key;
                return (
                  <div
                    key={l.key}
                    className={`wizard-option wizard-option-row ${active ? 'wizard-option-active' : ''}`}
                    onClick={() => handleLabelSelect(l)}
                  >
                    <div className="wizard-option-icon-sm" style={{
                      background: active ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                      color: active ? 'var(--primary-color)' : 'var(--text-secondary)',
                    }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="wizard-option-label">{l.label}</div>
                      <div className="wizard-option-desc">{l.desc}</div>
                    </div>
                    {active && <Check size={16} style={{ color: 'var(--primary-color)', marginLeft: 'auto' }} />}
                  </div>
                );
              })}
            </div>

            {/* Preprocessing preview */}
            {problem && Object.keys(selected.preprocessingConfig).some(k => selected.preprocessingConfig[k]) && (
              <div style={{
                marginTop: 16, padding: '12px 16px',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: 10, fontSize: 12, color: 'var(--text-secondary)'
              }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>Suggested preprocessing:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {Object.entries(selected.preprocessingConfig).filter(([,v]) => v).map(([k]) => (
                    <span key={k} className="badge badge-primary" style={{ fontSize: 11 }}>
                      {k.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                <p style={{ marginTop: 8, marginBottom: 0 }}>You can adjust these in the Dataset → Preprocessing tab.</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!canNext2}>
                Next <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Name + Template ── */}
        {step === 3 && (
          <div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Project Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="My Neural Network"
                value={selected.name}
                onChange={e => setSelected(prev => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Description (optional)</label>
              <textarea
                className="form-textarea"
                placeholder="What will this model do?"
                value={selected.description}
                onChange={e => setSelected(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Summary card */}
            <div style={{
              padding: '14px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 10, marginBottom: 20, fontSize: 13
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Project Summary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--text-secondary)' }}>
                <span>Problem: <strong style={{ color: 'var(--text-primary)' }}>{problem?.label}</strong></span>
                <span>Label type: <strong style={{ color: 'var(--text-primary)' }}>{LABEL_TYPES.find(l => l.key === selected.labelType)?.label}</strong></span>
                <span>Suggested template: <strong style={{ color: 'var(--text-primary)' }}>{selected.template || 'Blank'}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleCreate}
                disabled={!canCreate || loading}
              >
                Create Project <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectWizard;
