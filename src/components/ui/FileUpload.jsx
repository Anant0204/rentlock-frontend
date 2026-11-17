import { Upload, X, FileText } from 'lucide-react';
import { useState, useRef } from 'react';

export default function FileUpload({ label, accept, multiple, onChange, className = '' }) {
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles]);
    onChange?.(newFiles);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#4A6CF7] hover:bg-blue-50/30 transition-all duration-200 group"
      >
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={handleChange} className="hidden" />
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-[#4A6CF7] transition-colors" />
        <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
        <p className="text-xs text-gray-400 mt-1">PDF, DOC, JPG, PNG up to 10MB</p>
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl">
              <FileText className="w-4 h-4 text-[#4A6CF7]" />
              <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => removeFile(i)} className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
