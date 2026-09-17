import React, { useState, useRef } from 'react';
import { Subject, SyllabusUnit } from '../types';
import { api } from '../services/api';
import { 
  BookOpen, Plus, X, Sparkles, Trash2, ChevronDown, ChevronUp, 
  FileText, CheckCircle2, Layers, UploadCloud, FileUp, AlertTriangle, 
  Check, Info, HelpCircle
} from 'lucide-react';

interface CreateSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubjectCreated: (subj: Subject) => void;
}

export const CreateSubjectModal: React.FC<CreateSubjectModalProps> = ({
  isOpen,
  onClose,
  onSubjectCreated
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'SYLLABUS'>('DETAILS');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [regulation, setRegulation] = useState('R2021');
  const [semester, setSemester] = useState('V');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [description, setDescription] = useState('');
  
  // Extraction Report State
  const [extractionReport, setExtractionReport] = useState<{
    filename: string;
    found_fields: string[];
    missing_fields: string[];
    unit_count: number;
  } | null>(null);
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [fileDragActive, setFileDragActive] = useState(false);
  
  // Syllabus Units State
  const [units, setUnits] = useState<Array<{
    unit_number: number;
    title: string;
    topics: string[];
    learning_outcomes: string[];
    hours: number;
  }>>([
    {
      unit_number: 1,
      title: "Unit 1: Foundations & Core Principles",
      topics: ["Fundamental Architectures & Definitions", "Mathematical Formulations & Models", "Taxonomy & Standard Protocols"],
      learning_outcomes: ["Understand primary principles and mathematical modeling"],
      hours: 9
    },
    {
      unit_number: 2,
      title: "Unit 2: System Architecture & Protocols",
      topics: ["Component Decomposition & Schematics", "State Transitions & Operational Flow", "Modular Engineering Implementations"],
      learning_outcomes: ["Analyze system structure and modular interaction"],
      hours: 9
    },
    {
      unit_number: 3,
      title: "Unit 3: Algorithmic Analysis & Optimization",
      topics: ["Performance Modeling & Complexity Bounds", "Algorithmic Optimizations", "Constraint Solving & Sensitivity"],
      learning_outcomes: ["Execute formal computational and performance analysis"],
      hours: 9
    },
    {
      unit_number: 4,
      title: "Unit 4: Engineering Implementation & Case Studies",
      topics: ["Industrial Toolchains & Deployment Workflows", "Real-World Autonomous Case Studies", "Failure Mode Analysis (FMEA)"],
      learning_outcomes: ["Implement end-to-end applications and debug failure cases"],
      hours: 9
    },
    {
      unit_number: 5,
      title: "Unit 5: Advanced Trends & Security Governance",
      topics: ["Emerging Research Frontiers", "Cybersecurity, Auditing & Resilience", "Capstone Review & Autonomous Standards"],
      learning_outcomes: ["Evaluate modern trends, security vulnerabilities, and governance"],
      hours: 9
    }
  ]);

  const [expandedUnit, setExpandedUnit] = useState<number | null>(1);
  const [newTopicInputs, setNewTopicInputs] = useState<{ [unitNum: number]: string }>({});
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [rawTextModalOpen, setRawTextModalOpen] = useState(false);
  const [rawSyllabusText, setRawSyllabusText] = useState('');

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    try {
      setIsExtractingFile(true);
      const res = await api.extractSyllabusFromFile(file);
      
      // Auto-populate found details
      if (res.code) setCode(res.code);
      if (res.name) setName(res.name);
      if (res.regulation) setRegulation(res.regulation);
      if (res.department) setDepartment(res.department);
      if (res.semester) setSemester(res.semester);
      if (res.academic_year) setAcademicYear(res.academic_year);
      if (res.description) setDescription(res.description);
      if (res.units && Array.isArray(res.units) && res.units.length > 0) {
        setUnits(res.units);
      }

      setExtractionReport({
        filename: file.name,
        found_fields: res.found_fields || [],
        missing_fields: res.missing_fields || [],
        unit_count: res.units?.length || 0
      });

      // If units were extracted, user can switch to syllabus tab or review details
      if (res.units && res.units.length > 0) {
        setExpandedUnit(1);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to extract syllabus details from the uploaded document.');
    } finally {
      setIsExtractingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFileDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setFileDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setFileDragActive(false);
  };

  // Trigger AI Auto-Generate for full 5 units
  const handleAIGenerateSyllabus = async () => {
    if (!name.trim()) {
      alert('Please enter Course Title first so AI can generate the tailored syllabus.');
      return;
    }

    try {
      setAiGenerating(true);
      const generatedUnits = await api.generateSyllabusAI({
        code: code.trim() || 'ACAD101',
        name: name.trim(),
        department,
        regulation
      });
      if (generatedUnits && generatedUnits.length > 0) {
        setUnits(generatedUnits);
        setActiveTab('SYLLABUS');
        setExpandedUnit(1);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to auto-generate syllabus. Please check backend connection.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAddTopic = (unitNum: number) => {
    const inputVal = (newTopicInputs[unitNum] || '').trim();
    if (!inputVal) return;

    setUnits(prev => prev.map(u => {
      if (u.unit_number === unitNum) {
        return { ...u, topics: [...u.topics, inputVal] };
      }
      return u;
    }));

    setNewTopicInputs(prev => ({ ...prev, [unitNum]: '' }));
  };

  const handleRemoveTopic = (unitNum: number, topicIdx: number) => {
    setUnits(prev => prev.map(u => {
      if (u.unit_number === unitNum) {
        const newTopics = [...u.topics];
        newTopics.splice(topicIdx, 1);
        return { ...u, topics: newTopics };
      }
      return u;
    }));
  };

  const handleUpdateUnitTitle = (unitNum: number, newTitle: string) => {
    setUnits(prev => prev.map(u => u.unit_number === unitNum ? { ...u, title: newTitle } : u));
  };

  const handleUpdateUnitHours = (unitNum: number, hours: number) => {
    setUnits(prev => prev.map(u => u.unit_number === unitNum ? { ...u, hours } : u));
  };

  const handleAddUnit = () => {
    const nextNum = units.length + 1;
    setUnits(prev => [
      ...prev,
      {
        unit_number: nextNum,
        title: `Unit ${nextNum}: Advanced Module & Specialization`,
        topics: [`Module ${nextNum}.1 Fundamentals`, `Module ${nextNum}.2 Analysis`],
        learning_outcomes: [`Master Unit ${nextNum} objectives`],
        hours: 9
      }
    ]);
    setExpandedUnit(nextNum);
  };

  const handleRemoveUnit = (unitNum: number) => {
    if (units.length <= 1) {
      alert('A course must have at least 1 unit');
      return;
    }
    const filtered = units.filter(u => u.unit_number !== unitNum).map((u, idx) => ({
      ...u,
      unit_number: idx + 1
    }));
    setUnits(filtered);
    if (expandedUnit === unitNum) setExpandedUnit(1);
  };

  const handleParseRawText = async () => {
    if (!rawSyllabusText.trim()) return;
    try {
      setIsExtractingFile(true);
      const res = await api.parseSyllabusText(rawSyllabusText);

      // Auto-populate found details
      if (res.code) setCode(res.code);
      if (res.name) setName(res.name);
      if (res.regulation) setRegulation(res.regulation);
      if (res.department) setDepartment(res.department);
      if (res.semester) setSemester(res.semester);
      if (res.academic_year) setAcademicYear(res.academic_year);
      if (res.description) setDescription(res.description);
      if (res.units && Array.isArray(res.units) && res.units.length > 0) {
        setUnits(res.units);
      }

      setExtractionReport({
        filename: 'Pasted Syllabus Text',
        found_fields: res.found_fields || [],
        missing_fields: res.missing_fields || [],
        unit_count: res.units?.length || 0
      });

      setRawTextModalOpen(false);
      setRawSyllabusText('');
      if (res.units && res.units.length > 0) {
        setActiveTab('SYLLABUS');
        setExpandedUnit(1);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to parse syllabus text.');
    } finally {
      setIsExtractingFile(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      alert('Please fill Subject Code and Course Title');
      return;
    }

    try {
      setLoading(true);
      const newSubj = await api.createSubject({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        department,
        regulation,
        semester,
        academic_year: academicYear,
        description: description.trim(),
        units: units.map(u => ({
          unit_number: u.unit_number,
          title: u.title.trim(),
          topics: u.topics.filter(Boolean),
          learning_outcomes: u.learning_outcomes || [],
          hours: u.hours || 9
        })) as any
      });
      onSubjectCreated(newSubj);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isMissing = (fieldName: string) => {
    return extractionReport?.missing_fields.includes(fieldName);
  };

  const isFound = (fieldName: string) => {
    return extractionReport?.found_fields.includes(fieldName);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Hidden File Input for Syllabus Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
        accept=".pdf,.docx,.doc,.txt,.md,.json"
        className="hidden"
      />

      <div className="academic-glass bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl p-6 lg:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 transition-colors my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Create Course & Define Syllabus
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Smart Extraction
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload syllabus document (PDF/DOCX/TXT) to auto-extract details or configure curriculum manually
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

        {/* Syllabus Document Upload Dropzone & Quick AI Actions */}
        <div 
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`p-3.5 rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
            fileDragActive 
              ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40' 
              : 'border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-r from-indigo-50/40 via-purple-50/20 to-blue-50/30 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-slate-900/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              {isExtractingFile ? (
                <Sparkles className="w-5 h-5 animate-spin" />
              ) : (
                <UploadCloud className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {isExtractingFile ? 'Analyzing & Extracting Syllabus Document...' : 'Upload Course Syllabus Document'}
                </span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  PDF / DOCX / TXT
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Auto-extracts subject code, title, regulation, department, semester, and 5 syllabus units
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtractingFile}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>{isExtractingFile ? 'Extracting...' : 'Upload File'}</span>
            </button>

            <button
              type="button"
              onClick={() => setRawTextModalOpen(true)}
              className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Text</span>
            </button>
          </div>
        </div>

        {/* Extraction Report Banner (Found vs Missing Notification) */}
        {extractionReport && (
          <div className={`p-3.5 rounded-2xl border text-xs animate-in fade-in duration-200 shrink-0 ${
            extractionReport.missing_fields.length === 0
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700/50 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-200'
          }`}>
            <div className="flex items-start gap-2.5">
              {extractionReport.missing_fields.length === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">
                    Extraction Summary for "{extractionReport.filename}"
                  </span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-white/80 dark:bg-black/40 border border-current font-medium">
                    {extractionReport.unit_count} Units Extracted
                  </span>
                </div>

                <p className="text-[11px] leading-relaxed">
                  {extractionReport.found_fields.length > 0 && (
                    <span>
                      <strong className="text-emerald-700 dark:text-emerald-300">Auto-filled:</strong> {extractionReport.found_fields.map(f => f.replace('_', ' ')).join(', ')}.
                    </span>
                  )}
                  {extractionReport.missing_fields.length > 0 && (
                    <span className="ml-1 text-amber-800 dark:text-amber-300 font-medium">
                      ⚠️ <strong>Missing details in document:</strong> Please manually fill ({extractionReport.missing_fields.map(f => f.replace('_', ' ')).join(', ')}) below.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2 shrink-0">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab('DETAILS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'DETAILS'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              1. Basic Course Details
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SYLLABUS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'SYLLABUS'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              2. Course Syllabus ({units.length} Units)
            </button>
          </div>

          {/* Quick AI Action */}
          <button
            type="button"
            onClick={handleAIGenerateSyllabus}
            disabled={aiGenerating}
            className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${aiGenerating ? 'animate-spin' : ''}`} />
            {aiGenerating ? 'Synthesizing...' : '✨ AI Auto-Draft Syllabus'}
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleCreate} className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {activeTab === 'DETAILS' ? (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Subject Code *
                    </label>
                    {isFound('code') && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Auto-filled
                      </span>
                    )}
                    {isMissing('code') && !code && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> Fill manually
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS8591, CS3491, IT8602"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-mono uppercase transition ${
                      isMissing('code') && !code
                        ? 'border-amber-400 dark:border-amber-500 ring-1 ring-amber-400'
                        : 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Regulation *
                    </label>
                    {isFound('regulation') && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Auto-filled
                      </span>
                    )}
                    {isMissing('regulation') && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> Fill manually
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={regulation}
                    onChange={(e) => setRegulation(e.target.value)}
                    placeholder="e.g. R2021, R2023 Autonomous"
                    className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none transition ${
                      isMissing('regulation')
                        ? 'border-amber-400 dark:border-amber-500'
                        : 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Course Title / Subject Name *
                  </label>
                  {isFound('name') && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Auto-filled
                    </span>
                  )}
                  {isMissing('name') && !name && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" /> Fill manually
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Machine Learning, Cloud Computing, Database Systems"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none transition ${
                    isMissing('name') && !name
                      ? 'border-amber-400 dark:border-amber-500 ring-1 ring-amber-400'
                      : 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Department</label>
                    {isFound('department') && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Auto-filled
                      </span>
                    )}
                    {isMissing('department') && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> Verify/Fill
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Semester</label>
                    {isFound('semester') && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Auto-filled
                      </span>
                    )}
                    {isMissing('semester') && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> Verify
                      </span>
                    )}
                  </div>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Academic Year</label>
                    {isFound('academic_year') && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Auto-filled
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2025-2026"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Course Objectives & Scope (Optional)
                  </label>
                  {isFound('description') && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Auto-filled from Syllabus
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide educational aims, syllabus prerequisites, target learning outcomes..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Next: Check or customize syllabus units in the <b>Course Syllabus</b> tab ({units.length} Units loaded).</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('SYLLABUS')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Configure Syllabus →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Syllabus Units & Grounding Topics ({units.length} Units)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    All question papers, lecture notes, and answer keys will directly reference these topics.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setRawTextModalOpen(true)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Paste Raw Syllabus
                  </button>
                  <button
                    type="button"
                    onClick={handleAddUnit}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Unit
                  </button>
                </div>
              </div>

              {/* Units List */}
              <div className="space-y-3">
                {units.map((unit) => {
                  const isExpanded = expandedUnit === unit.unit_number;
                  return (
                    <div
                      key={unit.unit_number}
                      className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/40 overflow-hidden transition"
                    >
                      {/* Unit Header Bar */}
                      <div
                        onClick={() => setExpandedUnit(isExpanded ? null : unit.unit_number)}
                        className="flex items-center justify-between p-3.5 cursor-pointer bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
                      >
                        <div className="flex items-center space-x-3 flex-1 pr-3">
                          <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/20 shrink-0">
                            U{unit.unit_number}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {unit.title}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 shrink-0">
                            {unit.topics.length} Topics • {unit.hours} Hrs
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      {/* Unit Content Editor */}
                      {isExpanded && (
                        <div className="p-4 space-y-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-3">
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Unit Title
                              </label>
                              <input
                                type="text"
                                value={unit.title}
                                onChange={(e) => handleUpdateUnitTitle(unit.unit_number, e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Lecture Hours
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={30}
                                value={unit.hours}
                                onChange={(e) => handleUpdateUnitHours(unit.unit_number, parseInt(e.target.value) || 9)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          {/* Topics Manager */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                              Syllabus Topics & Core Modules
                            </label>
                            
                            <div className="flex flex-wrap gap-1.5 mb-2.5">
                              {unit.topics.map((top, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                                >
                                  {top}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTopic(unit.unit_number, tIdx)}
                                    className="text-indigo-400 hover:text-red-500 transition"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>

                            {/* Add Topic Input */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Add specific syllabus topic (e.g. Backpropagation Algorithm, CNN)..."
                                value={newTopicInputs[unit.unit_number] || ''}
                                onChange={(e) => setNewTopicInputs(prev => ({ ...prev, [unit.unit_number]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTopic(unit.unit_number);
                                  }
                                }}
                                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddTopic(unit.unit_number)}
                                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveUnit(unit.unit_number)}
                              className="text-red-500 hover:text-red-600 text-xs font-medium flex items-center gap-1 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove Unit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>

            <div className="flex items-center space-x-2">
              {activeTab === 'DETAILS' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('SYLLABUS')}
                  className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition"
                >
                  Configure Syllabus →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('DETAILS')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  ← Back to Details
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition disabled:opacity-50"
              >
                {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Course Workspace
              </button>
            </div>
          </div>
        </form>

        {/* Raw Text Parser Modal */}
        {rawTextModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-60 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Paste Syllabus Content
                </h4>
                <button onClick={() => setRawTextModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paste your university/autonomous syllabus text below. Headings starting with "Unit 1:", "Unit 2:", etc. will be automatically parsed into units and topics.
              </p>
              <textarea
                rows={8}
                value={rawSyllabusText}
                onChange={(e) => setRawSyllabusText(e.target.value)}
                placeholder="Unit 1: Foundations of Machine Learning
Supervised Learning, Linear Regression, Gradient Descent, Normal Equation

Unit 2: Classification & Decision Trees
Logistic Regression, Naive Bayes, Decision Trees, Random Forest..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRawTextModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleParseRawText}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                >
                  Parse & Apply Units
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
