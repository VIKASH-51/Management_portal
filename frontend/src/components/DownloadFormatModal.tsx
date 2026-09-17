import React, { useState } from 'react';
import { api } from '../services/api';
import { 
  Download, FileText, X, Check, FileSpreadsheet, 
  Archive, Code2, Sparkles, FileCode, Printer, Layers
} from 'lucide-react';

interface DownloadFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  qpId: number;
  subjectCode: string;
  subjectName: string;
  selectedSetCode: string;
  availableSets?: string[];
}

export const DownloadFormatModal: React.FC<DownloadFormatModalProps> = ({
  isOpen,
  onClose,
  qpId,
  subjectCode,
  subjectName,
  selectedSetCode,
  availableSets = ['Set A', 'Set B', 'Set C']
}) => {
  const [selectedSet, setSelectedSet] = useState<string>(selectedSetCode || 'Set A');
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'DOCX' | 'LATEX' | 'MARKDOWN' | 'TEXT' | 'ZIP' | 'DOSSIER'>('PDF');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getDownloadUrl = () => {
    switch (selectedFormat) {
      case 'PDF':
        return api.getExportQPPdfUrl(qpId, selectedSet);
      case 'DOCX':
        return api.getExportQPWordUrl(qpId, selectedSet);
      case 'LATEX':
        return api.getExportQPLatexUrl(qpId, selectedSet);
      case 'MARKDOWN':
        return api.getExportQPMdUrl(qpId, selectedSet);
      case 'TEXT':
        return api.getExportQPTxtUrl(qpId, selectedSet);
      case 'ZIP':
        return api.getExportQPZipPackUrl(qpId);
      case 'DOSSIER':
        return api.getExportVerifiedDossierUrl(qpId);
      default:
        return api.getExportQPPdfUrl(qpId, selectedSet);
    }
  };

  const getFormatFilename = () => {
    const cleanSubj = subjectCode || 'EXAM';
    const cleanSet = selectedSet.replace(' ', '_');
    switch (selectedFormat) {
      case 'PDF': return `QP_${cleanSubj}_${cleanSet}.pdf`;
      case 'DOCX': return `QP_${cleanSubj}_${cleanSet}.docx`;
      case 'LATEX': return `QP_${cleanSubj}_${cleanSet}.tex`;
      case 'MARKDOWN': return `QP_${cleanSubj}_${cleanSet}.md`;
      case 'TEXT': return `QP_${cleanSubj}_${cleanSet}.txt`;
      case 'ZIP': return `ExamPack_${cleanSubj}_AllSets.zip`;
      case 'DOSSIER': return `Certified_Exam_Dossier_${cleanSubj}.zip`;
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const url = getDownloadUrl();
      const filename = getFormatFilename();
      await api.downloadFile(url, filename);
      setTimeout(onClose, 500);
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadError(err.message || 'Download failed. Please check server connection.');
    } finally {
      setIsDownloading(false);
    }
  };

  const formats = [
    {
      id: 'PDF' as const,
      name: 'PDF Document (.pdf)',
      badge: 'Official Print-Ready',
      icon: Printer,
      color: 'from-rose-500/10 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      description: 'Official Autonomous Institute formatted examination sheet with college header, watermarks, duration & mark breakdown.'
    },
    {
      id: 'DOCX' as const,
      name: 'Microsoft Word (.docx)',
      badge: 'Editable Document',
      icon: FileText,
      color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      description: 'Fully editable Microsoft Word document with formatted headings, questions list, and autonomous styling.'
    },
    {
      id: 'LATEX' as const,
      name: 'LaTeX Source (.tex)',
      badge: 'Overleaf / TeX Ready',
      icon: Code2,
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      description: 'Clean LaTeX article source code with standard autonomous institute exam formatting for publishing.'
    },
    {
      id: 'MARKDOWN' as const,
      name: 'Markdown Source (.md)',
      badge: 'Web & LMS Compatible',
      icon: FileCode,
      color: 'from-purple-500/10 to-indigo-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      description: 'Clean markdown format for Moodle, Canvas, Blackboard, or local documentation archives.'
    },
    {
      id: 'TEXT' as const,
      name: 'Plain Text (.txt)',
      badge: 'Simple Raw Text',
      icon: FileText,
      color: 'from-slate-500/10 to-slate-700/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
      description: 'Lightweight plain text without formatting for quick copy-pasting into institute ERP.'
    },
    {
      id: 'ZIP' as const,
      name: 'Complete All-Sets ZIP Bundle (.zip)',
      badge: 'Full Exam Cell Archive',
      icon: Archive,
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      description: 'Complete examination archive including all sets (Set A, B, C...) in PDF + Word + LaTeX, plus matching Answer Keys.'
    },
    {
      id: 'DOSSIER' as const,
      name: 'Certified Accreditation Exam Dossier (.zip)',
      badge: 'NBA Master Bundle',
      icon: Archive,
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      description: 'Complete verified package with all question sets, answer key rubrics, OBE articulation matrix, and signed audit certificate.'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="academic-glass bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 lg:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 transition-colors my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Download Examination Materials
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {subjectCode}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose your desired export file format and question set
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Set Selector (if not ZIP) */}
        {selectedFormat !== 'ZIP' && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Question Paper Set:
            </span>
            <div className="flex items-center space-x-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {availableSets.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSet(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    selectedSet === s
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Format Cards Grid */}
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
          {formats.map((fmt) => {
            const Icon = fmt.icon;
            const isSelected = selectedFormat === fmt.id;
            return (
              <div
                key={fmt.id}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start space-x-3.5 ${
                  isSelected
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                    : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-gradient-to-br ${fmt.color}`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {fmt.name}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 shrink-0">
                      {fmt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {fmt.description}
                  </p>
                </div>

                <div className="shrink-0 pt-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Notification */}
        {downloadError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <span className="font-semibold">Error:</span> {downloadError}
          </div>
        )}

        {/* Footer & Direct Download Button */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isDownloading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition disabled:opacity-75"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Preparing & Downloading {selectedFormat}...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download {selectedFormat === 'ZIP' ? 'Full Archive Bundle' : `${selectedFormat} (${selectedSet})`}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
