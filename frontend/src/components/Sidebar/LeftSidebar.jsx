import {
  AlignJustify,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Grid3x3,
  Hash,
  Layers,
  Lightbulb,
  Link,
  Minimize2,
  Plus,
  ScanLine,
  Scissors,
  Search,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useBuilderStore } from "../../store/store";
import { LAYER_CATEGORIES } from "../../utils/layerDefs";
import { TEMPLATES } from "../../utils/templates";

const ICON_MAP = {
  ArrowDownToLine,
  ArrowUpFromLine,
  Link,
  Zap,
  Grid3x3,
  Minimize2,
  AlignJustify,
  Scissors,
  BarChart3,
  GitBranch,
  Hash,
  ScanLine,
  Layers,
  Plus,
};

const LeftSidebar = ({
  width = 288,
  minimized = false,
  onToggleMinimize,
  onResizeStart,
}) => {
  const [activeTab, setActiveTab] = useState("layers");
  const [search, setSearch] = useState("");
  const { loadGraph, clearCanvas } = useBuilderStore();

  const onDragStart = (event, item) => {
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({
        type: item.type,
        label: item.label,
        defaultParams: item.defaultParams,
      }),
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const handleLoadTemplate = (key) => {
    const template = TEMPLATES[key];
    if (!template) return;
    clearCanvas();
    setTimeout(() => {
      loadGraph({ nodes: template.nodes, edges: template.edges });
      toast.success(`Loaded ${template.name} template`);
    }, 50);
  };

  const filteredCategories = LAYER_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.desc.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <aside
      className="relative bg-[#0B0B0F]/90 backdrop-blur-xl border-r border-white/5 flex flex-col shrink-0 h-full z-10 shadow-[4px_0_24px_rgba(0,0,0,0.5)] overflow-visible"
      style={{ width: `${width}px` }}
    >
      {!minimized && (
        <>
          {/* Resize handle */}
          <div
            className="absolute top-0 -right-1 w-1 h-full cursor-col-resize bg-transparent hover:bg-cyan/25 transition-colors z-30"
            onMouseDown={onResizeStart}
            title="Resize sidebar"
          />

          <div className="h-full overflow-hidden flex flex-col">
            {/* Tabs */}
            <div className="flex p-3 gap-2 border-b border-white/5 shrink-0">
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-mono transition-all duration-300 ${
                  activeTab === "layers"
                    ? "bg-cyan/10 text-cyan border border-cyan/30 shadow-[0_0_15px_rgba(0,242,255,0.1)]"
                    : "text-dim hover:text-white hover:bg-white/5 border border-transparent"
                }`}
                onClick={() => setActiveTab("layers")}
              >
                <Layers size={16} />
                Layers
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-mono transition-all duration-300 ${
                  activeTab === "templates"
                    ? "bg-violet/10 text-violet border border-violet/30 shadow-[0_0_15px_rgba(138,43,226,0.1)]"
                    : "text-dim hover:text-white hover:bg-white/5 border border-transparent"
                }`}
                onClick={() => setActiveTab("templates")}
              >
                <Lightbulb size={16} />
                Templates
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
              {activeTab === "layers" ? (
                <>
                  {/* Search */}
                  <div className="p-4 shrink-0">
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-dim"
                      />
                      <input
                        type="text"
                        placeholder="Search layers..."
                        className="w-full bg-[#12121A] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-dim focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all font-mono"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Layer list */}
                  <div className="px-4 pb-6 space-y-6 flex-1">
                    {filteredCategories.map((section, idx) => (
                      <div key={idx} className="space-y-3">
                        <h4 className="text-xs font-mono font-bold text-white/40 uppercase tracking-wider pl-1">
                          {section.section}
                        </h4>
                        <div className="space-y-2">
                          {section.items.map((item, itemIdx) => {
                            const Icon = ICON_MAP[item.iconName] || Link;
                            return (
                              <div
                                key={itemIdx}
                                className="group p-3 rounded-xl border border-white/5 bg-[#12121A] hover:border-white/20 hover:bg-[#1A1A28] cursor-grab active:cursor-grabbing transition-all duration-300"
                                draggable
                                onDragStart={(e) => onDragStart(e, item)}
                              >
                                <div className="flex items-center gap-3 mb-1.5">
                                  <div
                                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                    style={{
                                      background: `${item.color}20`,
                                      color: item.color,
                                    }}
                                  >
                                    <Icon size={14} />
                                  </div>
                                  <span className="text-sm font-semibold text-white group-hover:text-cyan transition-colors">
                                    {item.label}
                                  </span>
                                </div>
                                <div className="text-xs text-dim leading-snug pl-10">
                                  {item.desc}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {filteredCategories.length === 0 && (
                      <div className="text-center text-dim text-sm py-10 font-mono">
                        No layers found
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Templates */
                <div className="p-4 space-y-3">
                  {Object.entries(TEMPLATES).map(([key, tpl]) => {
                    const TplIcon =
                      key === "cnn"
                        ? ScanLine
                        : key === "rnn"
                          ? GitBranch
                          : Layers;
                    return (
                      <div
                        key={key}
                        className="group p-4 rounded-2xl border border-white/5 bg-[#12121A] hover:border-violet/30 hover:bg-violet/5 hover:shadow-[0_0_20px_rgba(138,43,226,0.1)] cursor-pointer transition-all duration-300"
                        onClick={() => handleLoadTemplate(key)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: `${tpl.color}20`,
                              color: tpl.color,
                            }}
                          >
                            <TplIcon size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-violet transition-colors">
                              {tpl.name}
                            </h4>
                            <span className="text-xs font-mono text-dim px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                              {tpl.nodes.length} layers
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-dim leading-snug">
                          {tpl.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Long, short-breadth minimize button on right side */}
      <button
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-24 rounded-full border border-white/15 bg-[#12121A] text-dim hover:text-cyan hover:border-cyan/40 transition-all flex items-center justify-center z-20"
        onClick={onToggleMinimize}
        title={minimized ? "Expand sidebar" : "Minimize sidebar"}
      >
        {minimized ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
};

export default LeftSidebar;
