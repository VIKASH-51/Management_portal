import React, { useState, useEffect } from 'react';
import { Subject, QuestionBankItem } from '../types';
import { api } from '../services/api';
import { 
  Database, Search, Filter, Plus, Download, 
  Trash2, Layers, CheckCircle2, AlertCircle, RefreshCw 
} from 'lucide-react';

interface QuestionBankManagerProps {
  subject: Subject;
}

export const QuestionBankManager: React.FC<QuestionBankManagerProps> = ({ subject }) => {
  const [items, setItems] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedBloom, setSelectedBloom] = useState<string>('');
  const [selectedSetOrigin, setSelectedSetOrigin] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const handleExport = async (format: 'excel' | 'docx' | 'pdf') => {
    try {
      setDownloadingFormat(format);
      const unitNum = selectedUnit ? Number(selectedUnit) : undefined;
      const isExtra = selectedSetOrigin === 'Extra Pool' ? true : undefined;
      const setOrig = (selectedSetOrigin && selectedSetOrigin !== 'Extra Pool') ? selectedSetOrigin : undefined;

      let url = '';
      let defaultName = `${subject.code}_Question_Bank`;
      if (unitNum) defaultName += `_Unit${unitNum}`;
      if (selectedSetOrigin) defaultName += `_${selectedSetOrigin.replace(/\s+/g, '_')}`;

      if (format === 'excel') {
        url = api.getExportQuestionBankExcelUrl(subject.id, unitNum, setOrig, isExtra);
        defaultName += '.xlsx';
      } else if (format === 'docx') {
        url = api.getExportQuestionBankDocxUrl(subject.id, unitNum, setOrig, isExtra);
        defaultName += '.docx';
      } else if (format === 'pdf') {
        url = api.getExportQuestionBankPdfUrl(subject.id, unitNum, setOrig, isExtra);
        defaultName += '.pdf';
      }
      await api.downloadFile(url, defaultName);
    } catch (err: any) {
      console.error('Failed to export question bank:', err);
      alert('Failed to export Question Bank: ' + (err.message || 'Server error'));
    } finally {
      setDownloadingFormat(null);
    }
  };

  // New Question Form state
  const [newUnit, setNewUnit] = useState(1);
  const [newTopic, setNewTopic] = useState('');
  const [newText, setNewText] = useState('');
  const [newMarks, setNewMarks] = useState(2);
  const [newDiff, setNewDiff] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [newBloom, setNewBloom] = useState('Understand');
  const [newType, setNewType] = useState('SHORT_ANSWER');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedUnit) params.unit = Number(selectedUnit);
      if (selectedDifficulty) params.difficulty = selectedDifficulty;
      if (selectedBloom) params.bloom = selectedBloom;
      if (selectedSetOrigin) {
        if (selectedSetOrigin === 'Extra Pool') {
          params.is_extra_pool = true;
        } else {
          params.set_origin = selectedSetOrigin;
        }
      }
      if (search) params.search = search;

      const data = await api.getQuestionBank(subject.id, params);
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [subject.id, selectedUnit, selectedDifficulty, selectedBloom, selectedSetOrigin, search]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    try {
      await api.addQuestionBankItem({
        subject_id: subject.id,
        unit_number: newUnit,
        topic: newTopic.trim() || `Unit ${newUnit} Concept`,
        question_text: newText.trim(),
        marks: newMarks,
        difficulty: newDiff,
        bloom_level: newBloom,
        question_type: newType,
        tags: [subject.code, `Unit_${newUnit}`, newBloom]
      });

      setShowAddModal(false);
      setNewText('');
      setNewTopic('');
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this question from the course question bank?')) return;
    try {
      await api.deleteQuestionBankItem(id);
      setItems(items.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Course Question Bank Repository
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Categorized by Syllabus Unit, Marks Weightage, Bloom's Taxonomy & Difficulty Index
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Multi-Format Export Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => handleExport('excel')}
              disabled={downloadingFormat !== null}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
              title="Export filtered Question Bank to Excel (.xlsx)"
            >
              {downloadingFormat === 'excel' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-600" />
              )}
              Excel
            </button>

            <button
              onClick={() => handleExport('docx')}
              disabled={downloadingFormat !== null}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
              title="Export filtered Question Bank to Word (.docx)"
            >
              {downloadingFormat === 'docx' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-blue-600" />
              )}
              Word
            </button>

            <button
              onClick={() => handleExport('pdf')}
              disabled={downloadingFormat !== null}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
              title="Export filtered Question Bank to PDF (.pdf)"
            >
              {downloadingFormat === 'pdf' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
              ) : (
                <Download className="w-3.5 h-3.5 text-rose-500" />
              )}
              PDF
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Question
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="academic-glass bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 shadow-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions by keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        {/* Origin / Pool Filter */}
        <select
          value={selectedSetOrigin}
          onChange={(e) => setSelectedSetOrigin(e.target.value)}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Sets & Pools</option>
          <option value="Set A">Set A Origin</option>
          <option value="Set B">Set B Origin</option>
          <option value="Set C">Set C Origin</option>
          <option value="Extra Pool">Extra Reserve Pool (+15)</option>
        </select>

        {/* Unit Filter */}
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(e.target.value)}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Units (1–5)</option>
          <option value="1">Unit 1: Foundations</option>
          <option value="2">Unit 2: Architecture & Protocols</option>
          <option value="3">Unit 3: Analysis & Optimization</option>
          <option value="4">Unit 4: Advanced Systems</option>
          <option value="5">Unit 5: Case Study & Applications</option>
        </select>

        {/* Difficulty Filter */}
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>

        {/* Bloom Filter */}
        <select
          value={selectedBloom}
          onChange={(e) => setSelectedBloom(e.target.value)}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Bloom Levels</option>
          <option value="Remember">Remember</option>
          <option value="Understand">Understand</option>
          <option value="Apply">Apply</option>
          <option value="Analyze">Analyze</option>
          <option value="Evaluate">Evaluate</option>
          <option value="Create">Create</option>
        </select>
      </div>

      {/* Questions Table */}
      <div className="academic-glass bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900 dark:text-white">
            Questions Found: ({items.length})
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            Autonomous Syllabus Question Pool
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Loading question bank...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No questions matching the selected filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
            {items.map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700">
                      Unit {item.unit_number}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                      {item.marks} Marks
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      item.difficulty === 'EASY' 
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' 
                        : item.difficulty === 'MEDIUM' 
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20' 
                          : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                    }`}>
                      {item.difficulty}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      Bloom: {item.bloom_level}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                    {item.question_text}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition shrink-0"
                  title="Delete question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="academic-glass bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Add Question to Course Bank
            </h3>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5].map(u => <option key={u} value={u}>Unit {u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Marks</label>
                  <select
                    value={newMarks}
                    onChange={(e) => setNewMarks(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value={2}>2 Marks (Part A)</option>
                    <option value={10}>10 Marks</option>
                    <option value={13}>13 Marks (Part B)</option>
                    <option value={15}>15 Marks (Part C)</option>
                    <option value={16}>16 Marks</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Difficulty</label>
                  <select
                    value={newDiff}
                    onChange={(e: any) => setNewDiff(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Bloom's Taxonomy</label>
                  <select
                    value={newBloom}
                    onChange={(e) => setNewBloom(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Remember">Remember (L1)</option>
                    <option value="Understand">Understand (L2)</option>
                    <option value="Apply">Apply (L3)</option>
                    <option value="Analyze">Analyze (L4)</option>
                    <option value="Evaluate">Evaluate (L5)</option>
                    <option value="Create">Create (L6)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Question Text</label>
                <textarea
                  rows={3}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Enter complete examination question formulation..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
