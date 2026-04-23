import {
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Settings2,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useBuilderStore } from "../../store/store";
import { graphToJson } from "../../utils/graphToJson";
import { LAYER_INFO, LAYER_PARAMS } from "../../utils/layerDefs";

const RightSidebar = ({
  code = "",
  framework = "keras",
  onFrameworkChange,
  onCodeUpdate,
  width = 320,
  minimized = false,
  onToggleMinimize,
  onResizeStart,
}) => {
  const [activeTab, setActiveTab] = useState("code");
  const [copied, setCopied] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [serverSummary, setServerSummary] = useState(null);
  const { selectedNode, updateNodeData, nodes, edges } = useBuilderStore();

  const lines = code.split("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `model.py`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded model.py");
  };

  const handleParamChange = (key, value) => {
    if (!selectedNode) return;
    const newParams = { ...selectedNode.data.params, [key]: value };
    updateNodeData(selectedNode.id, { params: newParams });
  };

  const paramDefs = selectedNode
    ? LAYER_PARAMS[selectedNode.data.type] || []
    : [];
  const layerInfo = selectedNode ? LAYER_INFO[selectedNode.data.type] : null;

  return (
    <aside
      className="relative bg-[#0B0B0F]/90 backdrop-blur-xl border-l border-white/5 flex flex-col shrink-0 h-full z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.5)] overflow-visible"
      style={{ width: `${width}px` }}
    >
      {!minimized && (
        <>
          {/* Resize handle */}
          <div
            className="absolute top-0 -left-1 w-1 h-full cursor-col-resize bg-transparent hover:bg-cyan/25 transition-colors z-30"
            onMouseDown={onResizeStart}
            title="Resize sidebar"
          />

          <div className="h-full overflow-hidden flex flex-col">
            {/* Tabs */}
            <div className="flex p-3 gap-2 border-b border-white/5 shrink-0">
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-mono transition-all duration-300 ${
                  activeTab === "code"
                    ? "bg-acid/10 text-acid border border-acid/30 shadow-[0_0_15px_rgba(204,255,0,0.1)]"
                    : "text-dim hover:text-white hover:bg-white/5 border border-transparent"
                }`}
                onClick={() => setActiveTab("code")}
              >
                <Box size={16} />
                Code
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-mono transition-all duration-300 ${
                  activeTab === "props"
                    ? "bg-cyan/10 text-cyan border border-cyan/30 shadow-[0_0_15px_rgba(0,242,255,0.1)]"
                    : "text-dim hover:text-white hover:bg-white/5 border border-transparent"
                }`}
                onClick={() => setActiveTab("props")}
              >
                <Settings2 size={16} />
                Properties
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col relative">
              {activeTab === "code" ? (
                <div className="flex flex-col h-full">
                  {/* Code header */}
                  <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#12121A] shrink-0">
                    <span className="px-2 py-1 rounded border border-acid/20 text-acid bg-acid/5 font-mono text-[10px] uppercase tracking-wider">
                      {framework === "keras" ? "Keras" : "PyTorch"}
                    </span>
                    <select
                      className="bg-[#0B0B0F] border border-white/10 text-dim text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-acid focus:ring-1 focus:ring-acid"
                      value={framework}
                      onChange={(e) => onFrameworkChange?.(e.target.value)}
                    >
                      <option value="keras">Keras</option>
                      <option value="pytorch">PyTorch</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="p-4 grid grid-cols-2 gap-2 border-b border-white/5 shrink-0 bg-[#0B0B0F]">
                    <button
                      className="col-span-2 px-4 py-2 bg-acid text-black font-bold font-mono text-xs rounded-xl hover:bg-[#b3e600] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={async () => {
                        setCompiling(true);
                        try {
                          const graphJson = graphToJson(nodes, edges);
                          const payload = {
                            layers: graphJson.layers,
                            connections: graphJson.connections.map((c) => ({
                              source: c.from,
                              target: c.to,
                            })),
                            optimizer: "adam",
                            loss: "categorical_crossentropy",
                            learning_rate: 0.001,
                          };
                          const { data } = await api.post("/compile", payload);
                          if (data.is_valid && data.source_code) {
                            onCodeUpdate?.(data.source_code);
                            setServerSummary(data.summary);
                            toast.success(
                              `Compiled! ${data.layer_count} layers via AST`,
                            );
                          } else {
                            toast.error(data.error || "Compilation failed");
                          }
                        } catch (err) {
                          toast.error(
                            err.response?.data?.detail || "Compile failed",
                          );
                        } finally {
                          setCompiling(false);
                        }
                      }}
                      disabled={compiling || nodes.length === 0}
                    >
                      {compiling ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Zap size={14} />
                      )}
                      {compiling ? "COMPILING..." : "COMPILE TO AST"}
                    </button>

                    <button
                      className="px-3 py-2 rounded-xl border border-white/10 bg-[#12121A] text-dim hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2 font-mono text-xs"
                      onClick={handleDownload}
                    >
                      <Download size={14} /> Download
                    </button>
                    <button
                      className="px-3 py-2 rounded-xl border border-white/10 bg-[#12121A] text-dim hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2 font-mono text-xs"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check size={14} className="text-acid" />
                      ) : (
                        <Copy size={14} />
                      )}
                      {copied ? "Copied" : "Copy Code"}
                    </button>
                  </div>

                  {serverSummary && (
                    <div className="m-4 p-3 rounded-xl bg-violet/10 border border-violet/20 text-violet font-mono text-xs whitespace-pre-wrap shrink-0 max-h-32 overflow-y-auto">
                      {serverSummary}
                    </div>
                  )}

                  {/* Code block */}
                  <div className="flex-1 overflow-auto bg-[#0B0B0F] p-4 text-[13px] font-mono leading-relaxed select-text">
                    {lines.map((line, idx) => (
                      <div key={idx} className="flex">
                        <div className="w-8 shrink-0 text-white/20 select-none text-right pr-3 border-r border-white/5 mr-3">
                          {idx + 1}
                        </div>
                        <div className={`whitespace-pre ${getLineClass(line)}`}>
                          {line || " "}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Properties panel */
                <div className="flex-1 p-4">
                  {selectedNode ? (
                    <div className="space-y-6">
                      <div className="p-4 rounded-2xl bg-[#12121A] border border-white/5 flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                          style={{
                            background: layerInfo?.color || "#6366f1",
                            color: "#fff",
                          }}
                        >
                          <Settings2 size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            {selectedNode.data.label}
                          </h4>
                          <span className="text-xs font-mono text-dim uppercase tracking-wider">
                            {selectedNode.data.type}
                          </span>
                        </div>
                      </div>

                      {paramDefs.length > 0 ? (
                        <div className="space-y-4">
                          {paramDefs.map((param) => (
                            <div key={param.key} className="space-y-1.5">
                              <label className="block text-xs font-mono text-dim">
                                {param.label}
                              </label>
                              {param.type === "select" ? (
                                <select
                                  className="w-full bg-[#12121A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
                                  value={
                                    selectedNode.data.params?.[param.key] ?? ""
                                  }
                                  onChange={(e) =>
                                    handleParamChange(param.key, e.target.value)
                                  }
                                >
                                  {param.options.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={param.type}
                                  className="w-full bg-[#12121A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all placeholder:text-white/20"
                                  placeholder={param.placeholder}
                                  value={
                                    selectedNode.data.params?.[param.key] ?? ""
                                  }
                                  onChange={(e) =>
                                    handleParamChange(
                                      param.key,
                                      param.type === "number"
                                        ? parseFloat(e.target.value) || 0
                                        : e.target.value,
                                    )
                                  }
                                  min={param.min}
                                  max={param.max}
                                  step={param.step}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-dim text-center py-8">
                          No configurable parameters for this layer.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 text-dim">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                        <Settings2 size={32} className="opacity-50" />
                      </div>
                      <p className="text-sm">
                        Select a node on the canvas to view and edit its
                        properties.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Long, short-breadth minimize button on left side */}
      <button
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-24 rounded-full border border-white/15 bg-[#12121A] text-dim hover:text-cyan hover:border-cyan/40 transition-all flex items-center justify-center z-20"
        onClick={onToggleMinimize}
        title={minimized ? "Expand sidebar" : "Minimize sidebar"}
      >
        {minimized ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </aside>
  );
};

function getLineClass(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith("#")) return "text-white/30 italic";
  if (trimmed.startsWith("import") || trimmed.startsWith("from"))
    return "text-violet";
  if (
    trimmed.startsWith("class") ||
    trimmed.startsWith("def") ||
    trimmed.startsWith("model.")
  )
    return "text-cyan";
  if (trimmed.includes("=")) return "text-white";
  return "text-acid/80";
}

export default RightSidebar;
