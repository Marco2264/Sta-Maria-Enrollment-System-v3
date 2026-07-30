import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Camera, Upload, AlertCircle, CheckCircle2, X, RefreshCw, Loader2 } from 'lucide-react';
import { uploadToImageKit, validateImageFile, getAvatarInitials } from '../../lib/services/imageUploadService';

export interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  folder?: string;
  name?: string;
  shape?: 'circle' | 'square';
  size?: number; // size in pixels (default: 120)
  className?: string;
}

export function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  folder = '/uploads',
  name = 'User',
  shape = 'circle',
  size = 120,
  className = ''
}: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeDisplayUrl = previewUrl || currentImageUrl;
  const initials = getAvatarInitials(name);
  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  // Step 1: File Selection with Immediate Loading Feedback (No auto-upload)
  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid image file.');
      return;
    }

    setIsReadingFile(true);

    // Revoke old blob preview if exists
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    const localBlob = URL.createObjectURL(file);
    
    // Brief loading effect for instant visual feedback on file selection
    setTimeout(() => {
      setPreviewUrl(localBlob);
      setIsReadingFile(false);
    }, 250);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isUploading && !isReadingFile) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isUploading && !isReadingFile && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const triggerSelect = () => {
    if (!isUploading && !isReadingFile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCancelSelection = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setErrorMessage(null);
    setIsReadingFile(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Step 2: Confirm & Start Upload
  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const uploadedUrl = await uploadToImageKit(selectedFile, {
        folder,
        fileName: `${shape}_profile_${Date.now()}`,
        onProgress: (p) => setUploadProgress(p)
      });

      setIsUploading(false);
      setUploadProgress(100);

      // Clean up selected preview
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);

      // Trigger callback to parent component which shows top green notification banner & updates Firestore
      onImageUploaded(uploadedUrl);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('[ImageUpload] Upload error:', err);
      setIsUploading(false);
      setUploadProgress(0);
      setErrorMessage(err?.message || 'Upload failed. Please check your credentials and try again.');
    }
  };

  // SVG circular progress ring metrics
  const strokeWidth = 4;
  const radius = 54;
  const circumference = 2 * Math.PI * radius; // ~339.29
  const strokeDashoffset = circumference - (uploadProgress / 100) * circumference;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Avatar Container with Animated Blue Progress Ring & Centered Percentage */}
      <div className="relative flex items-center justify-center" style={{ width: `${size + 16}px`, height: `${size + 16}px` }}>
        <div
          className={`relative cursor-pointer group overflow-hidden border-2 border-slate-200 hover:border-blue-500/60 transition-all duration-300 ${roundedClass} ${
            isDragging ? 'ring-4 ring-blue-400/30 border-blue-500 scale-105' : ''
          }`}
          style={{ width: `${size}px`, height: `${size}px` }}
          onClick={triggerSelect}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {activeDisplayUrl ? (
            <img
              src={activeDisplayUrl}
              alt={name}
              className={`w-full h-full object-cover transition-transform duration-300 ${roundedClass}`}
              onError={() => {
                setPreviewUrl(null);
              }}
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br from-blue-50 to-blue-100/80 text-[#0C3B99] font-black flex items-center justify-center text-2xl uppercase ${roundedClass}`}
            >
              {initials}
            </div>
          )}

          {/* Reading File Loading Overlay */}
          {isReadingFile && (
            <div className={`absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-white ${roundedClass} animate-in fade-in-50`}>
              <Loader2 className="w-6 h-6 animate-spin text-white mb-1" />
              <span className="text-[10px] font-bold tracking-wider uppercase">Loading...</span>
            </div>
          )}

          {/* Hover Camera Icon Overlay */}
          {!isUploading && !isReadingFile && (
            <div
              className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${roundedClass}`}
            >
              <Camera className="w-6 h-6 mb-1 text-white drop-shadow-md" />
              <span className="text-[10px] font-bold tracking-wider uppercase">Choose Photo</span>
            </div>
          )}
        </div>

        {/* Circular Blue Progress Ring */}
        {isUploading && (
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-10 animate-in fade-in-50 duration-200" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="stroke-blue-100"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="stroke-[#0C3B99] transition-all duration-300 ease-out"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        )}

        {/* Centered Percentage Badge at Bottom */}
        {isUploading && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-white/95 border border-blue-200 shadow-xs rounded-full text-[10px] font-black text-[#0C3B99] z-20 backdrop-blur-xs tracking-wide animate-in fade-in-50">
            {uploadProgress}%
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={onInputChange}
      />

      {/* Two-Step Action Controls */}
      {selectedFile && !isUploading ? (
        <div className="flex items-center gap-2 w-full animate-in fade-in-50 duration-200">
          <button
            type="button"
            onClick={handleConfirmUpload}
            disabled={isReadingFile}
            className="flex-1 px-4 py-2 text-xs font-bold bg-[#0C3B99] hover:bg-[#092c73] text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Confirm Upload</span>
          </button>
          <button
            type="button"
            onClick={handleCancelSelection}
            disabled={isReadingFile}
            className="px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerSelect}
          disabled={isUploading || isReadingFile}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span>{currentImageUrl ? 'Change Photo' : 'Select Image'}</span>
        </button>
      )}

      {/* Allowed Format Note */}
      <p className="text-[10px] text-slate-400 font-medium tracking-wide">
        JPG, PNG, WEBP UP TO 5MB
      </p>

      {/* Local Component Success Notification */}
      {successMessage && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold w-full text-center animate-in fade-in-50">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="flex-1 leading-tight">{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Notification with Retry */}
      {errorMessage && (
        <div className="flex flex-col items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium w-full text-center animate-in fade-in-50">
          <div className="flex items-center gap-2 w-full text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="flex-1 leading-tight">{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {selectedFile && (
            <button
              type="button"
              onClick={handleConfirmUpload}
              className="mt-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Confirm Upload</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
