import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { datasetsApi } from '../../services/api';
import { useDatasetStore } from '../../store/store';
import {
  Upload, File, Trash2, CheckCircle2, AlertCircle, HardDrive, Loader2,
  Database, Download, Image, Type, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

const BUILTIN_ICONS = {
  mnist: '0-9',
  fashion_mnist: 'T-shirt',
  cifar10: 'Car',
  cifar100: '100',
};

const DatasetUpload = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState('builtin');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [existingDatasets, setExistingDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [builtinDatasets, setBuiltinDatasets] = useState({});
  const [loadingBuiltin, setLoadingBuiltin] = useState(null); // key of currently loading dataset

  const { activeDataset, setActiveDataset } = useDatasetStore();

  // Load built-in dataset list and active dataset on mount
  useEffect(() => {
    loadBuiltinList();
    loadActiveDataset();
    loadDatasets();
  }, [projectId]);

  const loadBuiltinList = async () => {
    try {
      const { data } = await datasetsApi.listBuiltin();
      setBuiltinDatasets(data);
    } catch (err) {
      console.log('Could not load built-in datasets:', err.message);
    }
  };

  const loadActiveDataset = async () => {
    try {
      const { data } = await datasetsApi.getActive(projectId);
      if (data.active) {
        setActiveDataset(data);
      }
    } catch (err) {
      console.log('Could not load active dataset:', err.message);
    }
  };

  const handleLoadBuiltin = async (key) => {
    setLoadingBuiltin(key);
    try {
      const { data } = await datasetsApi.loadBuiltin(key, projectId);
      setActiveDataset(data);
      toast.success(`${data.name} loaded! ${data.num_train.toLocaleString()} training samples ready.`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load dataset');
    } finally {
      setLoadingBuiltin(null);
    }
  };

  const loadDatasets = async () => {
    setLoadingDatasets(true);
    try {
      const { data } = await datasetsApi.list(projectId);
      if (data) setExistingDatasets(data);
    } catch (err) {
      console.log('Could not load datasets:', err.message);
    } finally {
      setLoadingDatasets(false);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      type: file.name.endsWith('.csv') ? 'CSV' : file.type.startsWith('image/') ? 'Image' : 'Other',
      status: 'ready',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'image/*': ['.png', '.jpg', '.jpeg'], 'application/zip': ['.zip'] },
    multiple: true,
  });

  const handleUpload = async () => {
    if (files.length === 0) { toast.error('Add files first'); return; }
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.status === 'done') continue;

      setFiles((prev) => prev.map((file, idx) => idx === i ? { ...file, status: 'uploading', progress: 30 } : file));

      try {
        const formData = new FormData();
        formData.append('file', f.file);
        await datasetsApi.upload(projectId, formData);
        setFiles((prev) => prev.map((file, idx) => idx === i ? { ...file, status: 'done', progress: 100 } : file));
      } catch (err) {
        setFiles((prev) => prev.map((file, idx) => idx === i ? { ...file, status: 'error', progress: 0 } : file));
        toast.error(`Failed to upload ${f.name}`);
      }
    }

    setUploading(false);
    toast.success('Upload complete!');
    loadDatasets();
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDeleteDataset = async (datasetId) => {
    try {
      await datasetsApi.delete(datasetId);
      setExistingDatasets((prev) => prev.filter((d) => d.id !== datasetId));
      toast.success('Dataset deleted');
    } catch (err) {
      toast.error('Failed to delete dataset');
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-heading font-bold text-white mb-2">Datasets</h2>
        <p className="text-dim text-sm">Choose a built-in Keras dataset or upload your own</p>
      </div>

      {/* Active dataset indicator */}
      {activeDataset && activeDataset.active !== false && (
        <div className="p-4 rounded-2xl bg-cyan/10 border border-cyan/30 flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan/20 text-cyan flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <strong className="block text-white font-bold mb-1">{activeDataset.name || activeDataset.dataset}</strong>
              <span className="text-xs text-dim font-mono flex gap-2">
                {activeDataset.input_shape && <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5">Shape: {activeDataset.input_shape}</span>}
                {activeDataset.num_classes && <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5">{activeDataset.num_classes} classes</span>}
                {activeDataset.num_train && <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5">{activeDataset.num_train.toLocaleString()} samples</span>}
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg border border-cyan/40 text-cyan bg-cyan/10 font-mono text-xs uppercase tracking-wider font-bold">Active</span>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex p-1 bg-[#12121A] border border-white/10 rounded-xl w-max animate-fade-in-up">
        <button 
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-mono transition-all duration-300 ${activeTab === 'builtin' ? 'bg-white/10 text-white shadow-sm' : 'text-dim hover:text-white'}`} 
          onClick={() => setActiveTab('builtin')}
        >
          <Sparkles size={16} /> Built-in Datasets
        </button>
        <button 
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-mono transition-all duration-300 ${activeTab === 'upload' ? 'bg-white/10 text-white shadow-sm' : 'text-dim hover:text-white'}`} 
          onClick={() => setActiveTab('upload')}
        >
          <Upload size={16} /> Upload Custom
        </button>
      </div>

      {activeTab === 'builtin' ? (
        /* Built-in Keras datasets grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
          {Object.entries(builtinDatasets).map(([key, ds]) => {
            const isActive = activeDataset?.key === key;
            const isLoading = loadingBuiltin === key;
            return (
              <div 
                key={key} 
                className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col h-full ${
                  isActive 
                    ? 'bg-cyan/5 border-cyan' 
                    : 'bg-[#12121A] border-white/10 hover:border-white/20 hover:bg-[#1A1A28]'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" 
                    style={{
                      background: ds.category === 'image' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                      color: ds.category === 'image' ? '#a855f7' : '#06b6d4',
                    }}
                  >
                    {ds.category === 'image' ? <Image size={24} /> : <Type size={24} />}
                  </div>
                  {isActive && <span className="px-2 py-1 rounded bg-cyan/20 text-cyan text-xs font-mono font-bold uppercase">Active</span>}
                </div>
                
                <h4 className="text-lg font-bold text-white mb-2">{ds.name}</h4>
                <p className="text-sm text-dim leading-relaxed mb-4 flex-1">{ds.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-2 py-1 rounded border border-white/5 bg-[#0B0B0F] text-dim font-mono text-[10px]">Shape: <span className="text-white">{ds.input_shape}</span></span>
                  <span className="px-2 py-1 rounded border border-white/5 bg-[#0B0B0F] text-dim font-mono text-[10px]"><span className="text-white">{ds.num_classes}</span> classes</span>
                  <span className="px-2 py-1 rounded border border-white/5 bg-[#0B0B0F] text-dim font-mono text-[10px]"><span className="text-white">{ds.samples}</span></span>
                  <span className="px-2 py-1 rounded border border-white/5 bg-[#0B0B0F] text-dim font-mono text-[10px]">~<span className="text-white">{ds.size_mb} MB</span></span>
                </div>
                
                <button
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-mono text-sm transition-all ${
                    isActive 
                      ? 'bg-cyan/20 text-cyan cursor-default' 
                      : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                  }`}
                  onClick={() => handleLoadBuiltin(key)}
                  disabled={isLoading || isActive}
                >
                  {isLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Downloading...</>
                  ) : isActive ? (
                    <><CheckCircle2 size={16} /> Loaded</>
                  ) : (
                    <><Download size={16} /> Load Dataset</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Upload tab */
        <div className="space-y-6">
          <div 
            {...getRootProps()} 
            className={`p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 animate-fade-in-up ${
              isDragActive ? 'border-cyan bg-cyan/5' : 'border-white/20 bg-[#12121A] hover:border-white/40 hover:bg-[#1A1A28]'
            }`}
          >
            <input {...getInputProps()} />
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${isDragActive ? 'bg-cyan/20 text-cyan' : 'bg-white/5 text-dim'}`}>
              <Upload size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{isDragActive ? 'Drop files here...' : 'Drag & drop your dataset'}</h3>
            <p className="text-dim mb-6">or click to browse files</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-lg bg-cyan/10 text-cyan border border-cyan/20 font-mono text-xs">CSV</span>
              <span className="px-3 py-1 rounded-lg bg-violet/10 text-violet border border-violet/20 font-mono text-xs">PNG</span>
              <span className="px-3 py-1 rounded-lg bg-violet/10 text-violet border border-violet/20 font-mono text-xs">JPG</span>
              <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono text-xs">ZIP</span>
            </div>
          </div>

          {files.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-white/10 animate-fade-in-up">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                <h4 className="flex items-center gap-2 text-white font-bold"><HardDrive size={18} className="text-cyan" /> Files to Upload ({files.filter(f => f.status !== 'done').length})</h4>
                <button 
                  className="px-4 py-2 rounded-xl bg-cyan text-black font-bold font-mono text-xs hover:bg-cyan/90 transition-colors flex items-center gap-2 disabled:opacity-50" 
                  onClick={handleUpload} 
                  disabled={uploading}
                >
                  {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : 'Upload All'}
                </button>
              </div>
              <div className="space-y-2">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center p-3 rounded-xl bg-[#12121A] border border-white/5">
                    <div className="w-10 h-10 rounded-lg bg-white/5 text-dim flex items-center justify-center shrink-0 mr-4"><File size={18} /></div>
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="text-sm font-semibold text-white truncate mb-1">{f.name}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-dim font-mono">{formatSize(f.size)} · {f.type}</span>
                        {f.status === 'uploading' && (
                          <div className="h-1 flex-1 bg-[#0B0B0F] rounded-full overflow-hidden max-w-[100px]">
                            <div className="h-full bg-cyan transition-all duration-300" style={{ width: `${f.progress}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-center w-8 shrink-0">
                      {f.status === 'done' && <CheckCircle2 size={18} className="text-green-400" />}
                      {f.status === 'error' && <AlertCircle size={18} className="text-red-400" />}
                      {f.status === 'ready' && (
                        <button className="text-dim hover:text-red-400 transition-colors p-1" onClick={() => removeFile(f.id)}><Trash2 size={16} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingDatasets ? (
            <div className="flex items-center justify-center gap-3 p-10 text-dim font-mono text-sm">
              <Loader2 size={20} className="animate-spin" /> Loading datasets...
            </div>
          ) : existingDatasets.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-white/10 animate-fade-in-up">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                <h4 className="flex items-center gap-2 text-white font-bold"><HardDrive size={18} className="text-violet" /> Uploaded Datasets ({existingDatasets.length})</h4>
              </div>
              <div className="space-y-2">
                {existingDatasets.map((d) => (
                  <div key={d.id} className="flex items-center p-3 rounded-xl bg-[#12121A] border border-white/5 hover:border-white/10 transition-colors group">
                    <div className="w-10 h-10 rounded-lg bg-white/5 text-dim flex items-center justify-center shrink-0 mr-4"><File size={18} /></div>
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="text-sm font-semibold text-white truncate mb-1">{d.file_name}</div>
                      <div className="text-xs text-dim font-mono">{formatSize(d.file_size)} · {d.file_type} · {new Date(d.uploaded_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-green-400 font-mono"><CheckCircle2 size={14} /> Ready</span>
                      <button className="p-2 text-dim hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100" onClick={() => handleDeleteDataset(d.id)} title="Delete dataset">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatasetUpload;
