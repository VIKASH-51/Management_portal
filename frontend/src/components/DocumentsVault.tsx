import React, { useState, useEffect } from 'react';
import { Subject, DocumentItem } from '../types';
import { api } from '../services/api';
import { 
  FileText, Upload, Trash2, CheckCircle2, 
  Layers, FileCheck, Shield, Sparkles, AlertCircle 
} from 'lucide-react';

interface DocumentsVaultProps {
  subject: Subject;
}

export const DocumentsVault: React.FC<DocumentsVaultProps> = ({ subject }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('SYLLABUS');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const data = await api.getSubjectDocuments(subject.id);
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [subject.id]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploading(true);
      setMessage(null);
      await api.uploadDocument(subject.id, docType, selectedFile);
      setMessage({ type: 'success', text: `Document '${selectedFile.name}' processed and indexed into RAG vault!` });
      setSelectedFile(null);
      fetchDocs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload document' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document from the course RAG vault?')) return;
    try {
      await api.deleteDocument(docId);
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Syllabus & RAG Document Knowledge Base
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Private Course Vault for {subject.code} — Indexed for Retrieval-Augmented Generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            Data Isolation Active
          </span>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300' 
            : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Upload Zone */}
      <div className="academic-glass bg-white dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Upload New Reference / Syllabus File
        </h3>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Document Classification
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="SYLLABUS">Approved Syllabus</option>
                <option value="REFERENCE_BOOK">Reference Textbook Chapter</option>
                <option value="PREVIOUS_PAPER">Previous Exam Question Paper</option>
                <option value="LECTURE_NOTES">Faculty Lecture Notes</option>
                <option value="RESEARCH_PAPER">IEEE / Research Paper</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Select PDF, DOCX, or TXT File
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
            >
              {uploading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-indigo-200" />
                  Extracting Chunks & Embedding...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Index into RAG Store
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Uploaded Documents List */}
      <div className="academic-glass bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Indexed Course Documents ({documents.length})
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Semantic Token Similarity Enabled
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Loading course documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No course documents uploaded yet. Upload a syllabus or textbook chapter above.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">{doc.filename}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono uppercase text-[10px]">
                        {doc.document_type}
                      </span>
                      <span>• {(doc.file_size / 1024).toFixed(1)} KB</span>
                      <span>• {doc.chunk_count} RAG Chunks</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold">
                    PROCESSED
                  </span>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
