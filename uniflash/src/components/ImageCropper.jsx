import React, { useState, useRef, useEffect } from 'react';

const ImageCropper = ({ imageUrl, onCrop, onCancel }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setStartPoint({ x, y });
    setSelection({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isSelecting || !startPoint) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const x = Math.min(startPoint.x, currentX);
    const y = Math.min(startPoint.y, currentY);
    const width = Math.abs(currentX - startPoint.x);
    const height = Math.abs(currentY - startPoint.y);

    setSelection({ x, y, width, height });
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const handleCrop = () => {
    if (!selection || selection.width < 20 || selection.height < 20) {
      alert('Please select a larger area to crop');
      return;
    }

    const img = imageRef.current;
    const containerRect = containerRef.current.getBoundingClientRect();

    // Calculate scale between displayed size and actual image size
    const scaleX = img.naturalWidth / containerRect.width;
    const scaleY = img.naturalHeight / containerRect.height;

    // Create canvas for cropping
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size to cropped dimensions
    canvas.width = selection.width * scaleX;
    canvas.height = selection.height * scaleY;

    // Draw cropped portion
    ctx.drawImage(
      img,
      selection.x * scaleX,
      selection.y * scaleY,
      selection.width * scaleX,
      selection.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Convert to data URL
    const croppedImageUrl = canvas.toDataURL('image/png');
    onCrop(croppedImageUrl);
  };

  const handleUseFullImage = () => {
    onCrop(imageUrl);
  };

  return (
    <div className="image-cropper-overlay">
      <div className="image-cropper-modal">
        <div className="cropper-header">
          <h3>Select Diagram to Capture</h3>
          <p>Click and drag to select the area you want for your flashcard</p>
        </div>

        <div
          className="cropper-container"
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Slide to crop"
            draggable={false}
          />

          {selection && selection.width > 0 && (
            <div
              className="crop-selection"
              style={{
                left: selection.x,
                top: selection.y,
                width: selection.width,
                height: selection.height
              }}
            >
              <div className="crop-handles">
                <span className="handle nw"></span>
                <span className="handle ne"></span>
                <span className="handle sw"></span>
                <span className="handle se"></span>
              </div>
            </div>
          )}

          {/* Darkened overlay outside selection */}
          {selection && selection.width > 0 && (
            <div className="crop-overlay">
              <div className="overlay-top" style={{ height: selection.y }}></div>
              <div className="overlay-middle" style={{ top: selection.y, height: selection.height }}>
                <div className="overlay-left" style={{ width: selection.x }}></div>
                <div className="overlay-right" style={{ left: selection.x + selection.width }}></div>
              </div>
              <div className="overlay-bottom" style={{ top: selection.y + selection.height }}></div>
            </div>
          )}
        </div>

        <div className="cropper-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-secondary" onClick={handleUseFullImage}>
            Use Full Slide
          </button>
          <button
            className="btn-primary"
            onClick={handleCrop}
            disabled={!selection || selection.width < 20}
          >
            Crop & Create Card
          </button>
        </div>

        <div className="cropper-tips">
          <span>Tip: Select just the diagram or figure for better flashcards</span>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
