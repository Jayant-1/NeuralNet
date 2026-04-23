import {
  ArrowRight,
  Brain,
  Check,
  Image,
  Layers,
  Loader2,
  Table,
  Tag,
  TrendingUp,
  Type,
  X,
} from "lucide-react";
import React, { useState } from "react";

const PROBLEM_TYPES = [
  {
    key: "image_classification",
    label: "Image Classification",
    desc: "Categorize images (e.g. MNIST, CIFAR)",
    icon: Image,
    color: "#a855f7",
    inputType: "image",
    defaults: {
      normalize_pixels: true,
      one_hot_encode: true,
      random_flip: false,
      random_zoom: false,
      standardize: false,
      fill_na_mean: false,
    },
    suggestedTemplate: "cnn",
  },
  {
    key: "tabular_classification",
    label: "Tabular Classification",
    desc: "Classify rows in structured datasets",
    icon: Table,
    color: "#6366f1",
    inputType: "tabular",
    defaults: {
      normalize_pixels: false,
      one_hot_encode: true,
      standardize: true,
      fill_na_mean: true,
      random_flip: false,
      random_zoom: false,
    },
    suggestedTemplate: "mlp",
  },
  {
    key: "regression",
    label: "Regression",
    desc: "Predict continuous numerical values",
    icon: TrendingUp,
    color: "#10b981",
    inputType: "tabular",
    defaults: {
      normalize_pixels: false,
      one_hot_encode: false,
      standardize: true,
      fill_na_mean: true,
      random_flip: false,
      random_zoom: false,
    },
    suggestedTemplate: "mlp",
  },
  {
    key: "nlp",
    label: "Text / NLP",
    desc: "Sentiment analysis, text classification",
    icon: Type,
    color: "#06b6d4",
    inputType: "text",
    defaults: {
      normalize_pixels: false,
      one_hot_encode: false,
      standardize: false,
      fill_na_mean: false,
      random_flip: false,
      random_zoom: false,
    },
    suggestedTemplate: "rnn",
  },
  {
    key: "custom",
    label: "Custom / Other",
    desc: "Start with a blank canvas",
    icon: Brain,
    color: "#f59e0b",
    inputType: "tabular",
    defaults: {},
    suggestedTemplate: "",
  },
];

const LABEL_TYPES = [
  {
    key: "multi_class",
    label: "Multi-class",
    desc: "One label from many categories",
    icon: Tag,
    color: "#8A2BE2",
  },
  {
    key: "binary",
    label: "Binary",
    desc: "Yes/No, True/False, 0 or 1",
    icon: Check,
    color: "#FF6B00",
  },
  {
    key: "continuous",
    label: "Continuous",
    desc: "A number (regression output)",
    icon: TrendingUp,
    color: "#00FF41",
  },
  {
    key: "already_preprocessed",
    label: "Preprocessed",
    desc: "My data is ready as-is",
    icon: Check,
    color: "#00F2FF",
  },
];

const ProjectWizard = ({ onClose, onCreate, loading }) => {
  const [selected, setSelected] = useState({
    problemType: "image_classification",
    labelType: "multi_class",
    name: "",
    description: "",
  });

  const handleCreate = () => {
    if (!selected.name.trim()) return;

    const problem = PROBLEM_TYPES.find((p) => p.key === selected.problemType);
    const preprocessingConfig = { ...problem?.defaults };
    if (selected.labelType === "multi_class")
      preprocessingConfig.one_hot_encode = true;

    onCreate({
      name: selected.name,
      description: selected.description,
      template: problem?.suggestedTemplate || "custom",
      problem_type: selected.problemType,
      input_type: problem?.inputType || "tabular",
      preprocessing_config: preprocessingConfig,
    });
  };

  const canCreate = selected.name.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in-up">
      <div
        className="glass-panel w-full max-w-4xl rounded-3xl border border-white/10 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan via-violet to-acid opacity-50"></div>

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 text-cyan flex items-center justify-center glow-cyan">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-white">
                Create New Project
              </h2>
              <p className="text-xs text-dim">
                Configure your neural network workspace
              </p>
            </div>
          </div>
          <button
            className="p-2 text-dim hover:text-white transition-colors rounded-lg hover:bg-white/5"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-8">
          {/* Section 1: Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono text-dim uppercase tracking-wider mb-2">
                Project Name *
              </label>
              <input
                type="text"
                className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-xl px-4 py-3 text-sm text-[#E0E0E8] focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all duration-300 font-mono placeholder:text-[#6B6B80]/50"
                placeholder="My Neural Network"
                value={selected.name}
                onChange={(e) =>
                  setSelected((prev) => ({ ...prev, name: e.target.value }))
                }
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-dim uppercase tracking-wider mb-2">
                Description <span className="text-dim/50">(Optional)</span>
              </label>
              <input
                type="text"
                className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-xl px-4 py-3 text-sm text-[#E0E0E8] focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all duration-300 font-mono placeholder:text-[#6B6B80]/50"
                placeholder="What will this model do?"
                value={selected.description}
                onChange={(e) =>
                  setSelected((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="w-full h-px bg-white/5"></div>

          {/* Section 2: Problem Type */}
          <div>
            <div className="mb-4">
              <label className="block text-sm font-heading font-semibold text-white mb-1">
                Problem Type
              </label>
              <p className="text-xs text-dim">
                Select the core objective for your model.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PROBLEM_TYPES.map((p) => {
                const Icon = p.icon;
                const active = selected.problemType === p.key;
                return (
                  <div
                    key={p.key}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex items-start gap-4 ${
                      active
                        ? "shadow-[0_0_20px_rgba(0,242,255,0.15)]"
                        : "border-[#2A2A3A] bg-[#12121A] hover:border-white/20 hover:bg-[#1A1A28]"
                    }`}
                    style={
                      active
                        ? { borderColor: p.color, background: `${p.color}12` }
                        : undefined
                    }
                    onClick={() =>
                      setSelected((prev) => ({ ...prev, problemType: p.key }))
                    }
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: active ? `${p.color}33` : `${p.color}20`,
                        color: p.color,
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white mb-1 flex items-center justify-between">
                        {p.label}
                        {active && (
                          <Check size={14} className="text-cyan shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-dim leading-snug">
                        {p.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full h-px bg-white/5"></div>

          {/* Section 3: Label / Output Type */}
          <div>
            <div className="mb-4">
              <label className="block text-sm font-heading font-semibold text-white mb-1">
                Target / Label Type
              </label>
              <p className="text-xs text-dim">
                What does your data's target output look like?
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {LABEL_TYPES.map((l) => {
                const Icon = l.icon;
                const active = selected.labelType === l.key;
                return (
                  <div
                    key={l.key}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col gap-2 ${
                      active
                        ? ""
                        : "border-[#2A2A3A] bg-[#12121A] hover:border-white/20 hover:bg-[#1A1A28]"
                    }`}
                    style={
                      active
                        ? {
                            borderColor: l.color,
                            background: `${l.color}12`,
                            boxShadow: `0 0 20px ${l.color}33`,
                          }
                        : undefined
                    }
                    onClick={() =>
                      setSelected((prev) => ({ ...prev, labelType: l.key }))
                    }
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: `${l.color}${active ? "33" : "20"}`,
                          color: l.color,
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <span className="text-sm font-semibold text-white flex-1">
                        {l.label}
                      </span>
                      {active && <Check size={14} style={{ color: l.color }} />}
                    </div>
                    <span className="text-xs text-dim leading-snug">
                      {l.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 shrink-0 flex items-center justify-end gap-4 bg-[#0B0B0F]/80 backdrop-blur-md">
          <button
            className="px-6 py-2.5 rounded-xl border border-white/10 text-dim hover:text-white hover:bg-white/5 transition-colors font-mono text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2.5 rounded-xl bg-cyan/10 text-cyan border border-cyan/30 hover:bg-cyan/20 hover:shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all font-mono text-sm flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCreate}
            disabled={!canCreate || loading}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Create Project{" "}
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectWizard;
