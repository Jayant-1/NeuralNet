import React, { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { Search, Database, Plus, Trash2, X, Upload, Loader2, FolderOpen } from "lucide-react";
import { datasetsApi, projectsApi } from "../services/api";
import toast from "react-hot-toast";

const DatasetsPage = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadBuiltinDatasets();
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data } = await projectsApi.list();
      setProjects(data || []);
      if (data && data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      console.log("Failed to load projects for upload modal");
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedProjectId) {
      toast.error("Please select a project first");
      return;
    }
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      
      await datasetsApi.upload(selectedProjectId, formData);
      toast.success("Dataset uploaded successfully!");
      setShowUploadModal(false);
      setUploadFile(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to upload dataset");
    }
    setUploading(false);
  };


  const loadBuiltinDatasets = async () => {
    try {
      const { data } = await datasetsApi.listBuiltin();
      setDatasets(data.datasets || []);
    } catch (err) {
      toast.error("Failed to load datasets");
      // Fallback mock datasets if backend fails
      setDatasets([
        { id: "mnist", name: "MNIST Digits", type: "image", samples: 70000, features: "28x28", description: "Handwritten digits from 0-9" },
        { id: "titanic", name: "Titanic Survivors", type: "tabular", samples: 891, features: "12", description: "Predict survival on the Titanic" },
        { id: "california_housing", name: "California Housing", type: "tabular", samples: 20640, features: "8", description: "Predict median house values" },
      ]);
    }
    setLoading(false);
  };

  const filteredDatasets = datasets.filter((d) =>
    (d.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-[#0B0B0F] overflow-hidden">
      <Sidebar activePage="datasets" />

      <main className="flex-1 flex flex-col h-full overflow-y-auto relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan/5 via-[#0B0B0F] to-[#0B0B0F]">
        <div className="grain-overlay" />

        <div className="max-w-6xl w-full mx-auto p-8 lg:p-12 z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 animate-fade-in-up">
            <div className="mb-6 md:mb-0">
              <h1 className="text-3xl font-heading font-bold text-white mb-2">
                Dataset <span className="gradient-text">Library</span>
              </h1>
              <p className="text-dim text-sm">
                Manage global datasets to use across your NeuralNet projects.
              </p>
            </div>
            <button 
              className="px-5 py-2.5 rounded-xl bg-cyan/10 text-cyan border border-cyan/30 hover:bg-cyan/20 hover:shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all font-mono text-sm flex items-center gap-2"
              onClick={() => setShowUploadModal(true)}
            >
              <Plus size={18} />
              Upload Dataset
            </button>
          </div>

          {/* Search */}
          <div
            className="relative mb-8 max-w-md text-dim animate-fade-in-up"
            style={{ animationDelay: "0.05s" }}
          >
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="Search datasets..."
              className="w-full bg-[#1A1A28] border border-[#2A2A3A] rounded-xl pl-10 pr-4 py-3 text-sm text-[#E0E0E8] focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all font-mono placeholder:text-[#6B6B80]/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
               <div className="text-dim animate-pulse">Loading datasets...</div>
            ) : filteredDatasets.length > 0 ? (
              filteredDatasets.map((ds, idx) => (
                <div
                  key={ds.id || ds.key || idx}
                  className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-cyan/30 transition-all duration-300 group flex flex-col h-full animate-fade-in-up relative overflow-hidden"
                  style={{ animationDelay: `${0.05 * (idx + 1)}s` }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-cyan/50 transition-all duration-500"></div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 text-cyan flex items-center justify-center">
                      <Database size={20} />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold font-heading text-white mb-2">
                    {ds.name}
                  </h3>
                  <p className="text-sm text-dim mb-6 flex-1 line-clamp-2">
                    {ds.description || "A built-in dataset."}
                  </p>

                  <div className="flex items-center flex-wrap gap-3 mt-auto">
                    <span className="px-2.5 py-1 rounded-md bg-white/5 text-dim text-[10px] font-mono uppercase tracking-wider border border-white/10">
                      {ds.type || "tabular"}
                    </span>
                    <span className="text-[11px] text-dim font-mono">
                      {ds.samples || "~"} samples
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full glass-panel border-dashed border-2 border-[#2A2A3A] rounded-3xl p-16 flex flex-col items-center justify-center text-center animate-fade-in-up">
                <Database size={40} className="text-dim mb-4" />
                <h3 className="text-white font-heading font-bold mb-2">No Datasets Found</h3>
                <p className="text-dim text-sm">Upload a new dataset to get started.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in-up">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl p-8 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan to-violet"></div>
            
            <button 
              className="absolute top-6 right-6 text-dim hover:text-white transition-colors"
              onClick={() => setShowUploadModal(false)}
            >
              <X size={20} />
            </button>

            <h3 className="text-2xl font-bold font-heading text-white mb-2 flex items-center gap-3">
              <Database className="text-cyan" size={24} /> Upload Dataset
            </h3>
            <p className="text-dim text-sm mb-8">
              Datasets must be uploaded to a specific project workspace.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-mono text-dim uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FolderOpen size={14} /> Target Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-[#1A1A28] border border-[#2A2A3A] rounded-xl px-4 py-3 text-sm text-[#E0E0E8] focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all font-mono appearance-none"
                >
                  <option value="" disabled>Select a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {projects.length === 0 && (
                  <p className="text-xs text-red-400 mt-2 font-mono">You need to create a project first!</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono text-dim uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Upload size={14} /> Dataset File (CSV, PNG, JPG)
                </label>
                <div className="relative border-2 border-dashed border-[#2A2A3A] hover:border-cyan/50 rounded-xl p-8 transition-colors flex flex-col items-center justify-center text-center cursor-pointer bg-[#1A1A28]/50 overflow-hidden group">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    accept=".csv,image/*,.zip"
                  />
                  <div className="w-12 h-12 rounded-full bg-cyan/10 text-cyan flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload size={20} />
                  </div>
                  {uploadFile ? (
                    <div className="text-white font-semibold">{uploadFile.name}</div>
                  ) : (
                    <>
                      <div className="text-white font-semibold mb-1">Click or drag file here</div>
                      <div className="text-xs text-dim">Max size: 50MB</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                className="px-5 py-2.5 rounded-xl text-dim hover:text-white hover:bg-white/5 transition-colors font-mono text-sm"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2.5 rounded-xl bg-cyan text-black border border-cyan hover:bg-white transition-colors font-mono text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                onClick={handleUploadSubmit}
                disabled={uploading || !selectedProjectId || !uploadFile}
              >
                {uploading ? (
                  <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                ) : (
                  <><Upload size={16} /> Upload Now</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatasetsPage;
