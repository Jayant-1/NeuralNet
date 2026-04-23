import React, { useState, useEffect } from 'react';
import { projectsApi } from '../../services/api';
import { Settings2, CheckCircle2, Save, RotateCcw, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import './PreprocessingConfig.css';

// All available toggles grouped by category
const PREPROCESSING_GROUPS = [
  {
    key: 'normalization',
    label: 'Normalization & Scaling',
    color: '#6366f1',
    steps: [
      {
        key: 'normalize_pixels',
        label: 'Normalize pixel values (÷ 255)',
        desc: 'Scale image pixels from [0,255] to [0,1]. Essential for image models.',
        recommendedFor: ['image_classification'],
      },
      {
        key: 'standardize',
        label: 'Standardize features (Z-score)',
        desc: 'Transform each feature to zero mean, unit variance. Good for tabular data.',
        recommendedFor: ['tabular_classification', 'regression'],
      },
    ],
  },
  {
    key: 'labels',
    label: 'Label Encoding',
    color: '#10b981',
    steps: [
      {
        key: 'one_hot_encode',
        label: 'One-hot encode labels (to_categorical)',
        desc: 'Convert integer class labels to one-hot vectors. Required for categorical_crossentropy.',
        recommendedFor: ['image_classification', 'tabular_classification'],
      },
    ],
  },
  {
    key: 'missing',
    label: 'Missing Data',
    color: '#f59e0b',
    steps: [
      {
        key: 'fill_na_mean',
        label: 'Fill missing values with column mean',
        desc: 'Replace NaN values with the mean of each column. For tabular data.',
        recommendedFor: ['tabular_classification', 'regression'],
      },
    ],
  },
  {
    key: 'augmentation',
    label: 'Data Augmentation (Training only)',
    color: '#a855f7',
    steps: [
      {
        key: 'random_flip',
        label: 'Random horizontal flip',
        desc: 'Randomly flip images horizontally during training. Increases variety.',
        recommendedFor: ['image_classification'],
      },
      {
        key: 'random_zoom',
        label: 'Random zoom (±10%)',
        desc: 'Randomly zoom in/out of images. Requires scipy.',
        recommendedFor: ['image_classification'],
      },
    ],
  },
];

const PreprocessingConfig = ({ projectId, problemType }) => {
  const [config, setConfig] = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [projectId]);

  const loadConfig = async () => {
    try {
      const { data } = await projectsApi.get(projectId);
      setConfig(data.preprocessing_config || {});
    } catch (err) {
      console.log('Could not load project config');
    }
  };

  const toggle = (key) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await projectsApi.update(projectId, { preprocessing_config: config });
      toast.success('Preprocessing config saved!');
      setDirty(false);
    } catch (err) {
      toast.error('Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const resetToRecommended = () => {
    // Re-enable all recommended steps for the current problem type
    const recommended = {};
    PREPROCESSING_GROUPS.forEach(g => {
      g.steps.forEach(s => {
        recommended[s.key] = problemType ? s.recommendedFor.includes(problemType) : false;
      });
    });
    setConfig(recommended);
    setDirty(true);
    toast.success('Reset to recommended settings');
  };

  const activeCount = Object.values(config).filter(Boolean).length;

  return (
    <div className="preprocessing-config">
      <div className="preprocessing-header">
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Settings2 size={18} style={{ color: 'var(--primary-color)' }} />
            Preprocessing Configuration
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {activeCount} step{activeCount !== 1 ? 's' : ''} active — applied automatically before training
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={resetToRecommended} title="Reset to recommended">
            <RotateCcw size={14} /> Reset
          </button>
          <button
            className={`btn btn-sm ${dirty ? 'btn-primary' : 'btn-ghost'}`}
            onClick={saveConfig}
            disabled={saving || !dirty}
          >
            {saving ? 'Saving…' : <><Save size={14} /> Save</>}
          </button>
        </div>
      </div>

      {PREPROCESSING_GROUPS.map(group => (
        <div key={group.key} className="preprocessing-group">
          <div className="preprocessing-group-label" style={{ color: group.color }}>
            {group.label}
          </div>
          {group.steps.map(step => {
            const isOn = !!config[step.key];
            const isRecommended = problemType && step.recommendedFor.includes(problemType);
            return (
              <div
                key={step.key}
                className={`preprocessing-step ${isOn ? 'preprocessing-step-on' : ''}`}
                onClick={() => toggle(step.key)}
              >
                <div className={`preprocessing-toggle ${isOn ? 'toggle-on' : 'toggle-off'}`}>
                  <div className="toggle-thumb" />
                </div>
                <div className="preprocessing-step-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="preprocessing-step-label">{step.label}</span>
                    {isRecommended && (
                      <span className="badge badge-primary" style={{ fontSize: 10, padding: '1px 6px' }}>
                        recommended
                      </span>
                    )}
                  </div>
                  <span className="preprocessing-step-desc">{step.desc}</span>
                </div>
                {isOn && <CheckCircle2 size={16} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      ))}

      <div className="preprocessing-note">
        <Info size={13} />
        <span>These steps run on your data <strong>before</strong> model.fit(). They don't affect the model architecture — only the data pipeline.</span>
      </div>
    </div>
  );
};

export default PreprocessingConfig;
