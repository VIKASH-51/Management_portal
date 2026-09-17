import React, { useState, useEffect } from 'react';
import { Subject, QuestionPaper, AnswerKey } from '../types';
import { api } from '../services/api';
import { CheckSquare, Download, CheckCircle2, Shield, Layers, FileText, RefreshCw } from 'lucide-react';

interface AnswerKeyStudioProps {
  subject: Subject;
}

export const AnswerKeyStudio: React.FC<AnswerKeyStudioProps> = ({ subject }) => {
  const [questionPapers, setQuestionPapers] = useState<QuestionPaper[]>([]);
  const [selectedQP, setSelectedQP] = useState<QuestionPaper | null>(null);
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
  const [selectedSetCode, setSelectedSetCode] = useState<string>('Set A');
  const [loading, setLoading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const handleDownloadKey = async (format: 'pdf' | 'docx' | 'txt' | 'markdown' | 'zip') => {
    if (!selectedQP) return;
    try {
      setDownloadingFormat(format);
      let url = '';
      let defaultName = `${subject.code}_AnswerKey_${selectedSetCode.replace(/\s+/g, '_')}`;
      if (format === 'pdf') {
        url = api.getExportAnswerKeyPdfUrl(selectedQP.id, selectedSetCode);
        defaultName += '.pdf';
      } else if (format === 'docx') {
        url = api.getExportAnswerKeyWordUrl(selectedQP.id, selectedSetCode);
        defaultName += '.docx';
      } else if (format === 'txt') {
        url = api.getExportAnswerKeyTxtUrl(selectedQP.id, selectedSetCode);
        defaultName += '.txt';
      } else if (format === 'markdown') {
        url = api.getExportAnswerKeyMdUrl(selectedQP.id, selectedSetCode);
        defaultName += '.md';
      } else if (format === 'zip') {
        url = api.getExportAnswerKeyZipPackUrl(selectedQP.id);
        defaultName = `${subject.code}_AnswerKeys_MasterBundle.zip`;
      }
      await api.downloadFile(url, defaultName);
    } catch (err: any) {
      console.error('Answer Key download failed:', err);
      alert(`Failed to download answer key ${format.toUpperCase()}: ` + (err.message || 'Server error'));
    } finally {
      setDownloadingFormat(null);
    }
  };

  useEffect(() => {
    const fetchQPs = async () => {
      try {
        setLoading(true);
        const qps = await api.getQuestionPapers(subject.id);
        setQuestionPapers(qps);
        if (qps.length > 0) {
          setSelectedQP(qps[0]);
          const keys = await api.getAnswerKeys(qps[0].id);
          setAnswerKeys(keys);
          if (keys.length > 0) {
            setSelectedSetCode(keys[0].set_code);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQPs();
  }, [subject.id]);

  const currentKey = answerKeys.find(k => k.set_code === selectedSetCode) || answerKeys[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Scheme of Valuation & Evaluation Rubrics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Set-Wise Step-by-Step Mark Allocation Schemes • Diagram & Derivation Points • Multi-Format Exports
          </p>
        </div>

        {selectedQP && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {selectedSetCode} Valuation Ready
            </span>
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleDownloadKey('pdf')}
                disabled={downloadingFormat !== null}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
                title={`Download ${selectedSetCode} Evaluator PDF Scheme`}
              >
                {downloadingFormat === 'pdf' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-rose-500" />
                )}
                PDF
              </button>

              <button
                onClick={() => handleDownloadKey('docx')}
                disabled={downloadingFormat !== null}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
                title={`Download ${selectedSetCode} Word DOCX Scheme`}
              >
                {downloadingFormat === 'docx' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                )}
                Word
              </button>

              <button
                onClick={() => handleDownloadKey('txt')}
                disabled={downloadingFormat !== null}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
                title={`Download ${selectedSetCode} Plain Text Key`}
              >
                {downloadingFormat === 'txt' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                )}
                TXT
              </button>

              <button
                onClick={() => handleDownloadKey('markdown')}
                disabled={downloadingFormat !== null}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
                title={`Download ${selectedSetCode} Markdown Key`}
              >
                {downloadingFormat === 'markdown' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-purple-600" />
                )}
                MD
              </button>

              <button
                onClick={() => handleDownloadKey('zip')}
                disabled={downloadingFormat !== null}
                className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center gap-1 transition shadow-xs disabled:opacity-50"
                title="Download All Sets Master Valuation Pack (ZIP)"
              >
                {downloadingFormat === 'zip' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Layers className="w-3.5 h-3.5 text-white" />
                )}
                All Sets (ZIP)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Set Selector */}
      {selectedQP && (
        <div className="academic-card p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">Active Examination:</span>
            <span>{selectedQP.title}</span>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {answerKeys.map((ak) => (
              <button
                key={ak.id}
                onClick={() => setSelectedSetCode(ak.set_code)}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  selectedSetCode === ak.set_code
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {ak.set_code} Scheme
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Answer Key Content */}
      {currentKey ? (
        <div className="academic-paper-sheet space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Course: <strong>{subject.code} — {subject.name}</strong></span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{currentKey.set_code} Scheme of Valuation</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{currentKey.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Authorized Evaluation Guideline for Autonomous College Examiners
            </p>
          </div>

          {/* Rubric Cards */}
          <div className="space-y-4">
            {(currentKey.marking_rubrics || []).map((rubric, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-mono">{rubric.question_label}.</span>
                    <span className="text-slate-700 dark:text-slate-200">{rubric.question_text}</span>
                  </h4>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 shrink-0 ml-4">
                    [{rubric.marks} Marks]
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Step-by-Step Mark Breakdown:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {rubric.step_breakdown?.map((step: any, sIdx: number) => (
                      <div key={sIdx} className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <span className="text-slate-700 dark:text-slate-300 text-[11px] truncate">{step.step}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px] ml-2 shrink-0">
                          {step.marks} Mark{step.marks > 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="academic-card p-8 text-center text-xs text-slate-500 dark:text-slate-400">
          No Answer Keys generated yet. Generate an Examination Paper first in the Examination Workspace.
        </div>
      )}
    </div>
  );
};
