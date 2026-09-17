import React, { useState, useEffect } from 'react';
import { Subject, Note, NoteVersion } from '../types';
import { api } from '../services/api';
import { MermaidViewer } from './MermaidViewer';
import { 
  BookOpen, Download, CheckCircle2, 
  History, Edit3, Eye, FileText, Check, ArrowRight,
  AlertCircle, ShieldCheck, RefreshCw, Layers, Sliders, ChevronDown, ChevronUp
} from 'lucide-react';

interface LectureNotesStudioProps {
  subject: Subject;
}

export const LectureNotesStudio: React.FC<LectureNotesStudioProps> = ({ subject }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeView, setActiveView] = useState<'SPLIT' | 'PREVIEW' | 'EDITOR'>('SPLIT');
  
  // Generation state & customization options
  const [unitNumber, setUnitNumber] = useState<number>(1);
  const [topic, setTopic] = useState('');
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [pedagogicalDepth, setPedagogicalDepth] = useState<string>('DETAILED');
  const [includeDiagram, setIncludeDiagram] = useState(true);
  const [includeExamPoints, setIncludeExamPoints] = useState(true);
  const [includeMistakes, setIncludeMistakes] = useState(true);
  const [includeRevision, setIncludeRevision] = useState(true);

  const [agentSteps, setAgentSteps] = useState<any[]>([]);
  const [editableMarkdown, setEditableMarkdown] = useState('');
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const handleDownloadNote = async (format: 'pdf' | 'docx' | 'markdown') => {
    if (!selectedNote) return;
    try {
      setDownloadingFormat(format);
      let url = '';
      let defaultName = `${subject.code}_Unit${selectedNote.unit_number}_Notes`;
      if (format === 'pdf') {
        url = api.getExportNotesPdfUrl(selectedNote.id);
        defaultName += '.pdf';
      } else if (format === 'docx') {
        url = api.getExportNotesDocxUrl(selectedNote.id);
        defaultName += '.docx';
      } else {
        url = api.getExportNotesMdUrl(selectedNote.id);
        defaultName += '.md';
      }
      await api.downloadFile(url, defaultName);
    } catch (err: any) {
      console.error('Download failed:', err);
      alert(`Failed to download ${format.toUpperCase()}: ` + (err.message || 'Server error'));
    } finally {
      setDownloadingFormat(null);
    }
  };

  // Set default unit and topic when subject loads
  useEffect(() => {
    if (subject.units && subject.units.length > 0) {
      const u1 = subject.units[0];
      setUnitNumber(u1.unit_number);
      if (u1.topics && u1.topics.length > 0) {
        setTopic(u1.topics[0]);
      }
    }
  }, [subject]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const data = await api.getNotes(subject.id);
      setNotes(data);
      if (data.length > 0 && !selectedNote) {
        setSelectedNote(data[0]);
        setEditableMarkdown(data[0].content_markdown);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [subject.id]);

  useEffect(() => {
    if (selectedNote) {
      setEditableMarkdown(selectedNote.content_markdown);
      api.getNoteVersions(selectedNote.id).then(setVersions).catch(console.error);
    }
  }, [selectedNote]);

  // When unit number changes, set default topic from that unit
  const handleUnitChange = (uNum: number) => {
    setUnitNumber(uNum);
    const matchedUnit = subject.units?.find(u => u.unit_number === uNum);
    if (matchedUnit && matchedUnit.topics && matchedUnit.topics.length > 0) {
      setTopic(matchedUnit.topics[0]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    try {
      setGenerating(true);
      setAgentSteps([]);
      const result = await api.generateNotes({
        subject_id: subject.id,
        unit_number: unitNumber,
        topic: topic.trim(),
        include_diagram: includeDiagram,
        include_exam_points: includeExamPoints,
        include_common_mistakes: includeMistakes,
        include_revision: includeRevision
      });

      setAgentSteps(result.agent_steps);
      setSelectedNote(result.note);
      setEditableMarkdown(result.note.content_markdown);
      setNotes([result.note, ...notes.filter(n => n.id !== result.note.id)]);
    } catch (err) {
      console.error('Failed to generate notes', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedNote) return;
    try {
      const updated = await api.updateNote(selectedNote.id, {
        content_markdown: editableMarkdown,
        status: 'UNDER_REVIEW'
      });
      setSelectedNote(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      const v = await api.getNoteVersions(selectedNote.id);
      setVersions(v);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async () => {
    if (!selectedNote) return;
    try {
      const approved = await api.approveNote(selectedNote.id);
      setSelectedNote(approved);
      setNotes(notes.map(n => n.id === approved.id ? approved : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyVersion = (v: NoteVersion) => {
    setEditableMarkdown(v.content_markdown);
    setShowVersions(false);
  };

  // Extract available topics for current unit
  const currentUnitObj = subject.units?.find(u => u.unit_number === unitNumber);
  const currentUnitTopics = currentUnitObj?.topics || [];

  // Render formatted markdown notes
  const renderFormattedNotes = (md: string) => {
    if (!md) return null;
    const lines = md.split('\n');

    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-xl font-bold text-slate-900 dark:text-white mb-2 pb-1 border-b border-slate-200 dark:border-slate-800">{line.replace('# ', '')}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-base font-bold text-blue-800 dark:text-blue-300 mt-5 mb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('> [!IMPORTANT]')) {
        return null;
      }
      if (line.startsWith('> **Exam Point:**')) {
        return (
          <div key={idx} className="callout-exam text-xs text-blue-900 dark:text-blue-200 my-2">
            <span className="font-bold text-blue-800 dark:text-blue-300">EXAM POINT: </span>
            {line.replace('> **Exam Point:**', '').trim()}
          </div>
        );
      }
      if (line.startsWith('> [!WARNING]')) {
        return null;
      }
      if (line.startsWith('> **Common Mistake:**')) {
        return (
          <div key={idx} className="callout-warning text-xs text-amber-900 dark:text-amber-200 my-2">
            <span className="font-bold text-amber-800 dark:text-amber-300">COMMON MISTAKE: </span>
            {line.replace('> **Common Mistake:**', '').trim()}
          </div>
        );
      }
      if (line.startsWith('* ') || line.startsWith('- ')) {
        return (
          <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 ml-4 mb-1 list-disc">
            {line.substring(2)}
          </li>
        );
      }
      if (line.startsWith('```mermaid')) {
        return null;
      }
      if (line.trim() === '```') {
        return null;
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Lecture Courseware & Material Authoring
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Syllabus-Aligned Lecture Notes • Architectural Visuals • Common Pitfall Annotations • Multi-Format Export
          </p>
        </div>

        {/* Action Buttons */}
        {selectedNote && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>v{selectedNote.version}</span>
              </button>

              {showVersions && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-2 z-50">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 py-1 uppercase">Version History</p>
                  <div className="space-y-1">
                    {versions.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => handleApplyVersion(v)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-between"
                      >
                        <span>Version {v.version_number}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleApprove}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                selectedNote.status === 'APPROVED'
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {selectedNote.status === 'APPROVED' ? 'Approved by Faculty' : 'Approve Notes'}
            </button>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleDownloadNote('pdf')}
                disabled={downloadingFormat !== null}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
                title="Download High-Resolution Autonomous Format PDF Notes"
              >
                {downloadingFormat === 'pdf' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-rose-500" />
                )}
                PDF
              </button>

              <button
                onClick={() => handleDownloadNote('docx')}
                disabled={downloadingFormat !== null}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
                title="Download Editable Word Document (.docx)"
              >
                {downloadingFormat === 'docx' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                )}
                DOCX
              </button>

              <button
                onClick={() => handleDownloadNote('markdown')}
                disabled={downloadingFormat !== null}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
                title="Download Raw Markdown (.md)"
              >
                {downloadingFormat === 'markdown' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                )}
                MD
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generator Prompt & Customization Box */}
      <div className="academic-card p-5 space-y-4">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Unit
              </label>
              <select
                value={unitNumber}
                onChange={(e) => handleUnitChange(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {(subject.units || [1, 2, 3, 4, 5]).map((u, i) => (
                  <option key={i} value={typeof u === 'number' ? u : u.unit_number}>
                    {typeof u === 'number' ? `Unit ${u}` : `Unit ${u.unit_number}: ${u.title}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Topic / Concept
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Backpropagation Algorithm, TCP Congestion Control, B-Trees..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={generating}
                  className="btn-primary text-xs flex items-center gap-2 shrink-0"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-3.5 h-3.5" />
                      Generate Notes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Unit Syllabus Topics Quick Selector */}
          {currentUnitTopics.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap pt-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-500 shrink-0">
                Unit {unitNumber} Topics:
              </span>
              {currentUnitTopics.map((top, tIdx) => (
                <button
                  key={tIdx}
                  type="button"
                  onClick={() => setTopic(top)}
                  className={`text-[11px] px-2.5 py-0.5 rounded border transition ${
                    topic === top
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {top}
                </button>
              ))}
            </div>
          )}

          {/* Customization Toggle */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdvancedControls(!showAdvancedControls)}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5 hover:underline"
            >
              <Sliders className="w-3.5 h-3.5" />
              {showAdvancedControls ? 'Hide Pedagogical Customizations' : 'Configure Pedagogical Structure & Highlights'}
              {showAdvancedControls ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAdvancedControls && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Pedagogical Depth
                  </label>
                  <select
                    value={pedagogicalDepth}
                    onChange={(e) => setPedagogicalDepth(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="DETAILED">Comprehensive Textbook Standard</option>
                    <option value="ADVANCED">Advanced Research-Grade Analysis</option>
                    <option value="CONCISE">Exam-Oriented Concise Revision</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <input
                    type="checkbox"
                    id="diag_toggle"
                    checked={includeDiagram}
                    onChange={(e) => setIncludeDiagram(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="diag_toggle" className="text-slate-700 dark:text-slate-300 font-medium">
                    Mermaid Architecture Diagram
                  </label>
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <input
                    type="checkbox"
                    id="exam_toggle"
                    checked={includeExamPoints}
                    onChange={(e) => setIncludeExamPoints(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="exam_toggle" className="text-slate-700 dark:text-slate-300 font-medium">
                    [Exam Point] Callouts
                  </label>
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <input
                    type="checkbox"
                    id="mistake_toggle"
                    checked={includeMistakes}
                    onChange={(e) => setIncludeMistakes(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="mistake_toggle" className="text-slate-700 dark:text-slate-300 font-medium">
                    [Common Mistake] Highlights
                  </label>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Split-Pane Interactive Faculty Review & Editor Studio */}
      {selectedNote && (
        <div className="academic-card overflow-hidden">
          {/* Header Controls */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {selectedNote.title}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                Unit {selectedNote.unit_number}
              </span>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveView('SPLIT')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  activeView === 'SPLIT' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Split View
              </button>
              <button
                onClick={() => setActiveView('PREVIEW')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  activeView === 'PREVIEW' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Formatted Notes
              </button>
              <button
                onClick={() => setActiveView('EDITOR')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  activeView === 'EDITOR' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Markdown Editor
              </button>
            </div>
          </div>

          {/* Studio Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 min-h-[500px]">
            {/* Left Pane: Formatted Classroom Notes */}
            {(activeView === 'SPLIT' || activeView === 'PREVIEW') && (
              <div className="p-6 lg:p-8 space-y-4 overflow-y-auto max-h-[750px] bg-white dark:bg-slate-900/40">
                <div className="prose dark:prose-invert max-w-none text-xs">
                  {renderFormattedNotes(editableMarkdown)}
                </div>

                {/* Diagram */}
                {selectedNote.mermaid_diagram && (
                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Concept Architecture Diagram
                    </h4>
                    <MermaidViewer chart={selectedNote.mermaid_diagram} />
                  </div>
                )}
              </div>
            )}

            {/* Right Pane: Markdown Editor */}
            {(activeView === 'SPLIT' || activeView === 'EDITOR') && (
              <div className="p-6 lg:p-8 flex flex-col justify-between bg-slate-50/50 dark:bg-slate-950/50 space-y-4">
                <div className="space-y-2 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Faculty Markdown Editor
                    </label>
                    {saveSuccess && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Saved & Versioned!
                      </span>
                    )}
                  </div>
                  <textarea
                    value={editableMarkdown}
                    onChange={(e) => setEditableMarkdown(e.target.value)}
                    rows={22}
                    className="w-full flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-inner resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Saves create a timestamped faculty revision
                  </span>
                  <button
                    onClick={handleSaveEdit}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Revision
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
