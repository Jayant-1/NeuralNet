import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { datasetsApi } from '../../services/api';
import { Upload, File, Trash2, CheckCircle2, AlertCircle, HardDrive, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import './DatasetUpload.css';

const DatasetUpload = ({ projectId }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [existingDatasets, setExistingDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);

  // Load existing datasets on mount
  useEffect(() => {
    loadDatasets();
  }, [projectId]);

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
    loadDatasets(); // Refresh the list
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
        <h2>Dataset Upload</h2>
        <p>Upload your training data — CSV files or image archives</p>
      </div>

      {/* Dropzone */}
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

      {/* Pending files */}
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

      {/* Existing datasets from server */}
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
    </div>
  );
};

export default DatasetUpload;
