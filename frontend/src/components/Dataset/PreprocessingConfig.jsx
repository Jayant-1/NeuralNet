import React, { useState, useEffect } from 'react';
import { projectsApi } from '../../services/api';
import { Settings2, CheckCircle2, Save, RotateCcw, Info, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// All available toggles grouped by category
const PREPROCESSING_GROUPS = [
  {
    key: 'normalization',
    label: 'Normalization & Scaling',
    color: 'text-cyan border-cyan/30 bg-cyan/5',
    activeColor: 'bg-cyan',
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
    color: 'text-acid border-acid/30 bg-acid/5',
    activeColor: 'bg-acid',
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
    color: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
    activeColor: 'bg-orange-400',
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
    color: 'text-violet border-violet/30 bg-violet/5',
    activeColor: 'bg-violet',
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
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-heading font-bold text-white mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan/20 text-cyan flex items-center justify-center">
              <Settings2 size={24} />
            </div>
            Preprocessing
          </h2>
          <p className="text-dim text-sm font-mono">
            {activeCount} step{activeCount !== 1 ? 's' : ''} active — applied automatically before training
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="px-4 py-2 rounded-xl text-dim hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 font-mono text-xs border border-transparent"
            onClick={resetToRecommended}
            title="Reset to recommended"
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button
            className={`px-5 py-2.5 rounded-xl font-bold font-mono text-xs flex items-center gap-2 transition-all ${
              dirty 
                ? 'bg-cyan text-black hover:bg-cyan/90 shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
                : 'bg-white/5 text-dim border border-white/10 cursor-not-allowed'
            }`}
            onClick={saveConfig}
            disabled={saving || !dirty}
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Saving...</>
            ) : (
              <><Save size={14} /> Save Config</>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {PREPROCESSING_GROUPS.map((group, idx) => (
          <div 
            key={group.key} 
            className="glass-panel rounded-2xl border border-white/10 overflow-hidden animate-fade-in-up"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className={`px-5 py-3 border-b border-white/5 font-mono text-xs font-bold uppercase tracking-wider ${group.color}`}>
              {group.label}
            </div>
            <div className="divide-y divide-white/5">
              {group.steps.map(step => {
                const isOn = !!config[step.key];
                const isRecommended = problemType && step.recommendedFor.includes(problemType);
                return (
                  <div
                    key={step.key}
                    className={`p-5 flex items-start gap-4 transition-all duration-300 cursor-pointer ${
                      isOn ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'
                    }`}
                    onClick={() => toggle(step.key)}
                  >
                    {/* Toggle Switch */}
                    <div 
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 shrink-0 mt-0.5 border ${
                        isOn ? `${group.activeColor} border-transparent shadow-[0_0_10px_currentColor]` : 'bg-[#0B0B0F] border-white/20'
                      }`}
                    >
                      <div 
                        className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${
                          isOn ? 'left-[26px]' : 'left-1'
                        }`} 
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className={`text-sm font-bold transition-colors ${isOn ? 'text-white' : 'text-dim'}`}>
                          {step.label}
                        </h4>
                        {isRecommended && (
                          <span className="px-2 py-0.5 rounded border border-cyan/30 bg-cyan/10 text-cyan font-mono text-[10px] uppercase tracking-wider">
                            recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/40 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                    
                    <div className="shrink-0 w-6 flex justify-end">
                      {isOn && <CheckCircle2 size={18} className={group.activeColor.replace('bg-', 'text-')} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <Info size={18} className="shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          These steps run on your data <strong className="text-white">before</strong> <code>model.fit()</code>. They don't affect the model architecture — only the data pipeline.
        </p>
      </div>
    </div>
  );
};

export default PreprocessingConfig;
