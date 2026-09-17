import React, { useState, useEffect } from 'react';
import { Subject } from '../types';
import { api } from '../services/api';
import { MermaidViewer } from './MermaidViewer';
import { 
  Camera, Upload, CheckCircle2, 
  Layers, FileText, ArrowRight, Eye, RefreshCw, AlertCircle, Plus 
} from 'lucide-react';

interface VisionStudioProps {
  subject: Subject | null;
}

export const VisionStudio: React.FC<VisionStudioProps> = ({ subject }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [visionResult, setVisionResult] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!subject) return;
    try {
      const data = await api.getProcessedImages(subject.id);
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (subject) {
      fetchHistory();
    }
  }, [subject?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleProcessImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setProcessing(true);
      setMessage(null);
      const res = await api.processImage(subject ? subject.id : 1, selectedFile);
      setVisionResult(res);
      setMessage(`Successfully processed ${selectedFile.name}! Extracted text and generated live Mermaid diagram.`);
      if (subject) fetchHistory();
    } catch (err: any) {
      setMessage(`Error processing image: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handlePushToQuestionBank = async (q: any) => {
    if (!subject) {
      alert('Please select or create a course first to attach questions.');
      return;
    }
    try {
      await api.addQuestionBankItem({
        subject_id: subject.id,
        unit_number: q.unit || 1,
        topic: `${q.bloom} Level Extracted Question`,
        question_text: q.text,
        marks: q.marks || 13,
        difficulty: 'HARD',
        bloom_level: q.bloom || 'Analyze',
        question_type: 'DESCRIPTIVE',
        tags: [subject.code, 'VisionExtracted', 'DiagramBased']
      });
      alert('Question extracted from diagram has been added to the Course Question Bank!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Diagram OCR & Visual Architecture Analysis
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Circuit Schematics • Handwritten Papers • Network Topologies • Automated Flowchart Transcription
          </p>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          {message}
        </div>
      )}

      {/* Upload and Processing Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Dropzone */}
        <div className="academic-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Upload Diagram or Handwritten Paper
          </h3>

          <form onSubmit={handleProcessImage} className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-6 text-center transition bg-slate-50 dark:bg-slate-900/40">
              {previewUrl ? (
                <div className="space-y-3">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 object-contain"
                  />
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{selectedFile?.name}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Select an image or diagram to extract
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Supports PNG, JPG, WEBP (Flowcharts, handwritten question drafts, network topologies)
                  </p>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-3 block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!selectedFile || processing}
                className="btn-primary text-xs flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Analyzing Visual Content...
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    Extract Diagram & Questions
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Real-Time Extraction Results */}
        <div className="academic-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Transcription & Mermaid Diagram Output
          </h3>

          {visionResult ? (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Detected Content Type:</span>
                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold">
                  {visionResult.detected_type}
                </span>
              </div>

              {/* Extracted Text */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Extracted Text & Annotations:</p>
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{visionResult.extracted_text}</p>
              </div>

              {/* Mermaid Preview if Generated */}
              {visionResult.extracted_mermaid && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Synthesized Mermaid.js Architecture:</p>
                  <MermaidViewer chart={visionResult.extracted_mermaid} />
                </div>
              )}

              {/* Extracted Questions */}
              {visionResult.extracted_questions?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Formulated Examination Questions:</p>
                  {visionResult.extracted_questions.map((q: any, qIdx: number) => (
                    <div key={qIdx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold mr-2">
                          {q.marks} Marks • Bloom: {q.bloom}
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 mt-1">{q.text}</p>
                      </div>
                      <button
                        onClick={() => handlePushToQuestionBank(q)}
                        className="btn-secondary text-[11px] py-1 px-2.5 shrink-0"
                      >
                        + Add to Bank
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center text-xs text-slate-500 dark:text-slate-400 p-6">
              <Camera className="w-8 h-8 text-slate-400 mb-2" />
              <p>Upload a diagram or handwritten question draft to see real-time OCR and Mermaid flowchart generation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
