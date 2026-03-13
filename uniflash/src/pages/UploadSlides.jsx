import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { parsePPTX, validatePPTXFile } from '../services/pptxParser';
import { parsePDF, validatePDFFile, extractStructuredContentWithAI, getAllPDFPageImages } from '../services/pdfParser';

const UploadSlides = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ step: '', progress: 0 });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const isPPTX = validatePPTXFile(selectedFile);
    const isPDF = validatePDFFile(selectedFile);

    if (selectedFile && (isPPTX || isPDF)) {
      setFile(selectedFile);
      setFileType(isPDF ? 'pdf' : 'pptx');
      setError(null);
    } else {
      setError('Please select a valid PowerPoint (.pptx) or PDF file');
      setFile(null);
      setFileType(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadProgress({ step: 'Reading file...', progress: 5 });

    // Simulate progress during AI analysis
    let progressInterval = null;
    const startProgressSimulation = (startProgress, endProgress, step) => {
      let currentProgress = startProgress;
      progressInterval = setInterval(() => {
        if (currentProgress < endProgress) {
          currentProgress += 1;
          setUploadProgress({ step, progress: currentProgress });
        }
      }, 500);
    };

    const stopProgressSimulation = () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
    };

    try {
      let parsedContent;

      // Parse file based on type
      if (fileType === 'pdf') {
        setUploadProgress({ step: 'Extracting PDF pages...', progress: 10 });
        const pdfPages = await parsePDF(file);

        setUploadProgress({ step: 'Analyzing content with AI...', progress: 20 });
        // Start simulated progress during AI analysis
        startProgressSimulation(20, 55, 'Analyzing content with AI...');
        parsedContent = await extractStructuredContentWithAI(pdfPages);
        stopProgressSimulation();
      } else {
        setUploadProgress({ step: 'Parsing PowerPoint slides...', progress: 20 });
        startProgressSimulation(20, 55, 'Parsing PowerPoint slides...');
        parsedContent = await parsePPTX(file);
        stopProgressSimulation();
      }

      setUploadProgress({ step: 'Uploading to cloud...', progress: 60 });

      // Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('presentations')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploadProgress({ step: 'Creating presentation record...', progress: 75 });

      // Create presentation record
      const { data: presentation, error: dbError } = await supabase
        .from('presentations')
        .insert([
          {
            title: file.name.replace(/\.(pptx|pdf)$/i, ''),
            file_path: uploadData.path,
            file_type: fileType,
            uploaded_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress({ step: 'Saving slides...', progress: 90 });

      // Insert parsed slides/pages into database
      const slidesToInsert = parsedContent.map((item, index) => ({
        presentation_id: presentation.id,
        slide_number: item.slideNumber || item.pageNumber || index + 1,
        title: item.title || `${fileType === 'pdf' ? 'Page' : 'Slide'} ${index + 1}`,
        content: item.content || item.summary || item.rawText || '',
        created_at: new Date().toISOString(),
      }));

      const { error: slidesError } = await supabase
        .from('slides')
        .insert(slidesToInsert);

      if (slidesError) throw slidesError;

      setUploadProgress({ step: 'Complete!', progress: 100 });

      // Navigate to slide selection page
      setTimeout(() => {
        navigate(`/slides/${presentation.id}`);
      }, 500);
    } catch (err) {
      setError(err.message);
      setUploadProgress({ step: '', progress: 0 });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-slides">
      {/* Loading Overlay */}
      {uploading && (
        <div className="upload-loading-overlay">
          <div className="upload-loading-card">
            <div className="loading-animation">
              <div className="loading-doc">
                {fileType === 'pdf' ? '📄' : '📊'}
              </div>
              <div className="loading-sparkles">
                <span>✨</span>
                <span>✨</span>
                <span>✨</span>
              </div>
            </div>

            <h2>Processing Your {fileType === 'pdf' ? 'PDF' : 'Presentation'}</h2>
            <p className="loading-step">{uploadProgress.step}</p>

            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
            <span className="progress-percentage">{uploadProgress.progress}%</span>

            <div className="loading-tips">
              {uploadProgress.progress < 50 && (
                <p>🧠 AI is analyzing your content for optimal flashcard generation...</p>
              )}
              {uploadProgress.progress >= 50 && uploadProgress.progress < 80 && (
                <p>☁️ Securely uploading to the cloud...</p>
              )}
              {uploadProgress.progress >= 80 && (
                <p>🎉 Almost there! Finalizing your presentation...</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="upload-header">
        <h1>📤 Upload Presentation</h1>
        <p>Upload your PowerPoint (.pptx) or PDF files to extract content and create flashcards</p>
      </div>

      <div className="upload-container">
        <div className="upload-area">
          <input
            type="file"
            accept=".pptx,.pdf"
            onChange={handleFileChange}
            id="file-input"
            className="file-input"
          />
          <label htmlFor="file-input" className="file-label">
            <div className="upload-icon">📁</div>
            <div className="upload-text">
              {file ? `${file.name} (${fileType?.toUpperCase()})` : 'Click to select PowerPoint or PDF file'}
            </div>
            <div className="upload-hint">Supports .pptx and .pdf files</div>
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
            {uploading ? 'Processing...' : 'Upload & Parse'}
          </button>
        </div>
      </div>

      <div className="upload-info">
        <h3>What happens next?</h3>
        <ul>
          <li>📄 Your content will be extracted and parsed{fileType === 'pdf' ? ' using AI' : ''}</li>
          <li>✅ You can select which {fileType === 'pdf' ? 'pages' : 'slides'} to use</li>
          <li>🎴 Auto-generate flashcards from selected content</li>
          <li>🎯 Create quizzes from your content</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadSlides;
