import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const UploadSlides = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid PowerPoint file (.pptx)');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('presentations')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create presentation record
      const { data: presentation, error: dbError } = await supabase
        .from('presentations')
        .insert([
          {
            title: file.name.replace('.pptx', ''),
            file_path: uploadData.path,
            uploaded_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // Navigate to slide parsing/selection page
      navigate(`/slides/${presentation.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-slides">
      <div className="upload-header">
        <h1>📤 Upload PowerPoint</h1>
        <p>Upload your .pptx file to extract slides and create flashcards</p>
      </div>

      <div className="upload-container">
        <div className="upload-area">
          <input
            type="file"
            accept=".pptx"
            onChange={handleFileChange}
            id="file-input"
            className="file-input"
          />
          <label htmlFor="file-input" className="file-label">
            <div className="upload-icon">📁</div>
            <div className="upload-text">
              {file ? file.name : 'Click to select PowerPoint file'}
            </div>
            <div className="upload-hint">Only .pptx files are supported</div>
          </label>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <div className="upload-actions">
          <button
            className="btn-secondary"
            onClick={() => navigate('/dashboard')}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload & Parse'}
          </button>
        </div>
      </div>

      <div className="upload-info">
        <h3>What happens next?</h3>
        <ul>
          <li>📄 Your slides will be extracted and parsed</li>
          <li>✅ You can select which slides to use</li>
          <li>🎴 Auto-generate flashcards from selected slides</li>
          <li>🎯 Create quizzes from your content</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadSlides;
