import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { datasetsApi } from '../../services/api';
import { useDatasetStore } from '../../store/store';
import {
  Upload, File, Trash2, CheckCircle2, AlertCircle, HardDrive, Loader2,
  Database, Download, Image, Type, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import './DatasetUpload.css';

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
    <div className="feature-panel">
      <div className="panel-header animate-fade-in-up">
        <h2>Datasets</h2>
        <p>Choose a built-in Keras dataset or upload your own</p>
      </div>

      {/* Active dataset indicator */}
      {activeDataset && activeDataset.active !== false && (
        <div className="active-dataset-banner animate-fade-in-up">
          <div className="active-dataset-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="active-dataset-info">
            <strong>{activeDataset.name || activeDataset.dataset}</strong>
            <span>
              {activeDataset.input_shape && `Shape: ${activeDataset.input_shape}`}
              {activeDataset.num_classes && ` · ${activeDataset.num_classes} classes`}
              {activeDataset.num_train && ` · ${activeDataset.num_train.toLocaleString()} samples`}
            </span>
          </div>
          <span className="badge badge-green">Active</span>
        </div>
      )}

      {/* Tab switcher */}
      <div className="tabs animate-fade-in-up" style={{ marginBottom: 20 }}>
        <button className={`tab ${activeTab === 'builtin' ? 'active' : ''}`} onClick={() => setActiveTab('builtin')}>
          <Sparkles size={14} /> Built-in Datasets
        </button>
        <button className={`tab ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
          <Upload size={14} /> Upload Custom
        </button>
      </div>

      {activeTab === 'builtin' ? (
        /* Built-in Keras datasets grid */
        <div className="builtin-grid animate-fade-in-up">
          {Object.entries(builtinDatasets).map(([key, ds]) => {
            const isActive = activeDataset?.key === key;
            const isLoading = loadingBuiltin === key;
            return (
              <div key={key} className={`builtin-card ${isActive ? 'builtin-card-active' : ''}`}>
                <div className="builtin-card-header">
                  <div className="builtin-card-icon" style={{
                    background: ds.category === 'image' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                    color: ds.category === 'image' ? '#a855f7' : '#06b6d4',
                  }}>
                    {ds.category === 'image' ? <Image size={20} /> : <Type size={20} />}
                  </div>
                  {isActive && <span className="badge badge-green" style={{ fontSize: 10 }}>Active</span>}
                </div>
                <h4>{ds.name}</h4>
                <p className="builtin-card-desc">{ds.description}</p>
                <div className="builtin-card-meta">
                  <span>Shape: <code>{ds.input_shape}</code></span>
                  <span>{ds.num_classes} classes</span>
                  <span>{ds.samples}</span>
                  <span>~{ds.size_mb} MB</span>
                </div>
                <button
                  className={`btn ${isActive ? 'btn-success' : 'btn-primary'} w-full`}
                  onClick={() => handleLoadBuiltin(key)}
                  disabled={isLoading || isActive}
                  style={{ marginTop: 12 }}
                >
                  {isLoading ? (
                    <><Loader2 size={14} className="animate-spin" /> Downloading...</>
                  ) : isActive ? (
                    <><CheckCircle2 size={14} /> Loaded</>
                  ) : (
                    <><Download size={14} /> Load Dataset</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Upload tab */
        <>
          <div {...getRootProps()} className={`dropzone animate-fade-in-up ${isDragActive ? 'dropzone-active' : ''}`}>
            <input {...getInputProps()} />
            <div className="dropzone-content">
              <div className="dropzone-icon"><Upload size={28} /></div>
              <h3>{isDragActive ? 'Drop files here...' : 'Drag & drop your dataset'}</h3>
              <p>or click to browse files</p>
              <div className="dropzone-formats">
                <span className="badge badge-primary">CSV</span>
                <span className="badge badge-purple">PNG</span>
                <span className="badge badge-purple">JPG</span>
                <span className="badge badge-blue">ZIP</span>
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className="file-list animate-fade-in-up">
              <div className="file-list-header">
                <h4><HardDrive size={16} /> Files to Upload ({files.filter(f => f.status !== 'done').length})</h4>
                <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                  {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : 'Upload All'}
                </button>
              </div>
              {files.map((f) => (
                <div key={f.id} className="file-item">
                  <div className="file-icon"><File size={18} /></div>
                  <div className="file-info">
                    <span className="file-name">{f.name}</span>
                    <span className="file-meta">{formatSize(f.size)} · {f.type}</span>
                    {f.status === 'uploading' && (
                      <div className="file-progress"><div className="file-progress-bar" style={{ width: `${f.progress}%` }} /></div>
                    )}
                  </div>
                  <div className="file-status">
                    {f.status === 'done' && <CheckCircle2 size={18} className="text-green" />}
                    {f.status === 'error' && <AlertCircle size={18} className="text-red" />}
                    {f.status === 'ready' && (
                      <button className="btn-icon" onClick={() => removeFile(f.id)}><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {loadingDatasets ? (
            <div className="flex items-center justify-center gap-2" style={{ padding: 40, color: 'var(--text-secondary)' }}>
              <Loader2 size={18} className="animate-spin" /> Loading datasets...
            </div>
          ) : existingDatasets.length > 0 && (
            <div className="file-list animate-fade-in-up" style={{ marginTop: 20 }}>
              <div className="file-list-header">
                <h4><HardDrive size={16} /> Uploaded Datasets ({existingDatasets.length})</h4>
              </div>
              {existingDatasets.map((d) => (
                <div key={d.id} className="file-item">
                  <div className="file-icon"><File size={18} /></div>
                  <div className="file-info">
                    <span className="file-name">{d.file_name}</span>
                    <span className="file-meta">{formatSize(d.file_size)} · {d.file_type} · {new Date(d.uploaded_at).toLocaleDateString()}</span>
                  </div>
                  <div className="file-status">
                    <CheckCircle2 size={16} style={{ color: 'var(--accent-green)', marginRight: 8 }} />
                    <button className="btn-icon" onClick={() => handleDeleteDataset(d.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DatasetUpload;
