import React, { useState } from 'react';
import { LAYER_CATEGORIES } from '../../utils/layerDefs';
import { TEMPLATES } from '../../utils/templates';
import { useBuilderStore } from '../../store/store';
import {
  Layers, Lightbulb, Search,
  ArrowDownToLine, ArrowUpFromLine, Link, Zap, Grid3x3,
  Minimize2, AlignJustify, Scissors, BarChart3, GitBranch, Hash,
  ScanLine, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import './LeftSidebar.css';

const ICON_MAP = {
  ArrowDownToLine, ArrowUpFromLine, Link, Zap, Grid3x3,
  Minimize2, AlignJustify, Scissors, BarChart3, GitBranch, Hash,
  ScanLine, Layers, Plus
};

const LeftSidebar = () => {
  const [activeTab, setActiveTab] = useState('layers');
  const [search, setSearch] = useState('');
  const { loadGraph, clearCanvas } = useBuilderStore();

  const onDragStart = (event, item) => {
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({
        type: item.type,
        label: item.label,
        defaultParams: item.defaultParams,
      })
    );
    event.dataTransfer.effectAllowed = 'move';
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
        item.desc.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <aside className="sidebar sidebar-left">
      <div className="left-sidebar">
        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'layers' ? 'active' : ''}`}
            onClick={() => setActiveTab('layers')}
          >
            <Layers size={15} />
            Layers
          </button>
          <button
            className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            <Lightbulb size={15} />
            Templates
          </button>
        </div>

        {activeTab === 'layers' ? (
          <>
            {/* Search */}
            <div className="search-bar">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search layers..."
                className="search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Layer list */}
            <div className="layer-sections">
              {filteredCategories.map((section, idx) => (
                <div key={idx} className="layer-section">
                  <h4 className="section-title">{section.section}</h4>
                  {section.items.map((item, itemIdx) => {
                    const Icon = ICON_MAP[item.iconName] || Link;
                    return (
                      <div
                        key={itemIdx}
                        className="draggable-layer"
                        draggable
                        onDragStart={(e) => onDragStart(e, item)}
                        style={{
                          '--layer-color': item.color,
                          '--layer-bg': item.bgColor,
                          '--layer-border': item.borderColor,
                        }}
                      >
                        <div className="layer-header">
                          <div className="layer-icon-wrap" style={{ background: item.bgColor, color: item.color }}>
                            <Icon size={14} />
                          </div>
                          <span>{item.label}</span>
                        </div>
                        <div className="layer-desc">{item.desc}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Templates */
          <div className="templates-list">
            {Object.entries(TEMPLATES).map(([key, tpl]) => {
              const TplIcon = key === 'cnn' ? ScanLine : key === 'rnn' ? GitBranch : Layers;
              return (
                <div
                  key={key}
                  className="template-card"
                  onClick={() => handleLoadTemplate(key)}
                >
                  <div className="template-card-icon" style={{ background: `${tpl.color}20`, color: tpl.color }}>
                    <TplIcon size={22} />
                  </div>
                  <div className="template-card-info">
                    <h4>{tpl.name}</h4>
                    <p>{tpl.description}</p>
                    <span className="template-card-layers">{tpl.nodes.length} layers</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar;
