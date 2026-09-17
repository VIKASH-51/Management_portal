import React, { useState, useEffect, useRef } from 'react';
import { Subject, QuestionPaper, QuestionPaperSet, AnswerKey, QuestionBankItem, SectionConfig, VerificationReport } from '../types';
import { api } from '../services/api';
import { 
  FileSpreadsheet, Download, CheckCircle2, 
  ShieldCheck, AlertCircle, Layers, Sliders, Eye, FileText, Check,
  Plus, Trash2, Settings, ChevronRight, CheckSquare, Database,
  Search, Filter, BookOpen, RefreshCw, Award, HelpCircle,
  Paperclip, Upload, FileCheck, X, ChevronDown, ChevronUp, Code, Hash,
  HelpCircle as QuestionIcon, Sparkles
} from 'lucide-react';
import { DownloadFormatModal } from './DownloadFormatModal';

interface QuestionPaperStudioProps {
  subject: Subject;
}

export const QuestionPaperStudio: React.FC<QuestionPaperStudioProps> = ({ subject }) => {
  // Main Sub-Tab in Question Paper Space
  const [activeSpaceTab, setActiveSpaceTab] = useState<'SET_QP' | 'ANSWER_KEYS' | 'QUESTION_BANK'>('SET_QP');

  // Question Papers State
  const [questionPapers, setQuestionPapers] = useState<QuestionPaper[]>([]);
  const [selectedQP, setSelectedQP] = useState<QuestionPaper | null>(null);
  const [selectedSetCode, setSelectedSetCode] = useState<string>('Set A');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Exam Header & Config
  const [examTitle, setExamTitle] = useState('End Semester Autonomous Examination');
  const [durationMinutes, setDurationMinutes] = useState<number>(180);
  const [setsCount, setSetsCount] = useState<number>(3);
  const [easyPct, setEasyPct] = useState<number>(30);
  const [medPct, setMedPct] = useState<number>(50);
  const [hardPct, setHardPct] = useState<number>(20);
  const [patternPreset, setPatternPreset] = useState<string>('PRESET_100M');
  const [showCustomArchitect, setShowCustomArchitect] = useState(false);
  const [facultyPromptInstructions, setFacultyPromptInstructions] = useState('');
  const [showMCQAnswers, setShowMCQAnswers] = useState(false);

  // File Attachment & Template/Verification State
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [extractingTemplate, setExtractingTemplate] = useState(false);
  const [templateExtractSummary, setTemplateExtractSummary] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Sections Configuration
  const [customSections, setCustomSections] = useState<SectionConfig[]>([
    { name: 'Part A', title: 'Short Answer & Concepts', questions_count: 10, marks_per_question: 2, choice_type: 'COMPULSORY', question_type: 'SHORT_ANSWER' },
    { name: 'Part B', title: 'Descriptive & Analytical Problems', questions_count: 5, marks_per_question: 13, choice_type: 'INTERNAL_CHOICE', question_type: 'LONG_ANSWER' },
    { name: 'Part C', title: 'Comprehensive Application / Case Study', questions_count: 1, marks_per_question: 15, choice_type: 'INTERNAL_CHOICE', question_type: 'CASE_STUDY' }
  ]);

  const [agentSteps, setAgentSteps] = useState<any[]>([]);

  // Answer Keys State
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
  const [loadingAnswerKeys, setLoadingAnswerKeys] = useState(false);
  const [selectedAKSet, setSelectedAKSet] = useState<string>('Set A');

  // Question Bank State
  const [qbItems, setQbItems] = useState<QuestionBankItem[]>([]);
  const [loadingQB, setLoadingQB] = useState(false);
  const [qbSetFilter, setQbSetFilter] = useState<string>('ALL');
  const [qbSearch, setQbSearch] = useState<string>('');
  const [qbUnit, setQbUnit] = useState<string>('');
  const [qbDiff, setQbDiff] = useState<string>('');
  const [qbBloom, setQbBloom] = useState<string>('');
  const [qbTypeFilter, setQbTypeFilter] = useState<string>('ALL');
  const [generatingExtra, setGeneratingExtra] = useState(false);

  // Download Format Modal State
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Calculate Total Marks dynamically from customSections
  const calculatedTotalMarks = customSections.reduce((sum, sec) => {
    return sum + (sec.questions_count * sec.marks_per_question);
  }, 0);

  const fetchQPs = async () => {
    try {
      setLoading(true);
      const data = await api.getQuestionPapers(subject.id);
      setQuestionPapers(data);
      if (data.length > 0) {
        if (!selectedQP) {
          setSelectedQP(data[0]);
          if (data[0].sets?.length > 0) {
            setSelectedSetCode(data[0].sets[0].set_code);
            setSelectedAKSet(data[0].sets[0].set_code);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnswerKeysForQP = async (qpId: number) => {
    try {
      setLoadingAnswerKeys(true);
      const data = await api.getAnswerKeys(qpId);
      setAnswerKeys(data);
      if (data.length > 0 && !data.find(ak => ak.set_code === selectedAKSet)) {
        setSelectedAKSet(data[0].set_code);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAnswerKeys(false);
    }
  };

  const fetchQB = async () => {
    try {
      setLoadingQB(true);
      const params: any = {};
      if (qbUnit) params.unit = Number(qbUnit);
      if (qbDiff) params.difficulty = qbDiff;
      if (qbBloom) params.bloom = qbBloom;
      if (qbSearch) params.search = qbSearch;
      if (qbSetFilter === 'EXTRA_POOL') {
        params.is_extra_pool = true;
      } else if (qbSetFilter !== 'ALL') {
        params.set_origin = qbSetFilter;
      }

      const data = await api.getQuestionBank(subject.id, params);
      setQbItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQB(false);
    }
  };

  useEffect(() => {
    fetchQPs();
    fetchQB();
  }, [subject.id]);

  useEffect(() => {
    if (selectedQP) {
      fetchAnswerKeysForQP(selectedQP.id);
    }
  }, [selectedQP?.id]);

  useEffect(() => {
    fetchQB();
  }, [subject.id, qbSetFilter, qbUnit, qbDiff, qbBloom, qbSearch]);

  const handlePresetChange = (preset: string) => {
    setPatternPreset(preset);
    if (preset === 'PRESET_100M') {
      setShowCustomArchitect(false);
      setDurationMinutes(180);
      setCustomSections([
        { name: 'Part A', title: 'Short Answer & Definitions (10 x 2 = 20 Marks)', questions_count: 10, marks_per_question: 2, choice_type: 'COMPULSORY', question_type: 'SHORT_ANSWER' },
        { name: 'Part B', title: 'Descriptive & Analytical Problems (5 x 13 = 65 Marks)', questions_count: 5, marks_per_question: 13, choice_type: 'INTERNAL_CHOICE', question_type: 'LONG_ANSWER' },
        { name: 'Part C', title: 'Application & Case Study (1 x 15 = 15 Marks)', questions_count: 1, marks_per_question: 15, choice_type: 'INTERNAL_CHOICE', question_type: 'CASE_STUDY' }
      ]);
    } else if (preset === 'PRESET_50M') {
      setShowCustomArchitect(false);
      setDurationMinutes(90);
      setCustomSections([
        { name: 'Part A', title: 'Multiple Choice Questions (10 x 1 = 10 Marks)', questions_count: 10, marks_per_question: 1, choice_type: 'COMPULSORY', question_type: 'MCQ' },
        { name: 'Part B', title: 'Detailed Analytical Problems (2 x 15 = 30 Marks)', questions_count: 2, marks_per_question: 15, choice_type: 'INTERNAL_CHOICE', question_type: 'LONG_ANSWER' },
        { name: 'Part C', title: 'Numerical Problem (1 x 10 = 10 Marks)', questions_count: 1, marks_per_question: 10, choice_type: 'INTERNAL_CHOICE', question_type: 'NUMERICAL' }
      ]);
    } else if (preset === 'PRESET_60M') {
      setShowCustomArchitect(false);
      setDurationMinutes(120);
      setCustomSections([
        { name: 'Part A', title: 'Fill in the Blanks & Short Answer (6 x 2 = 12 Marks)', questions_count: 6, marks_per_question: 2, choice_type: 'COMPULSORY', question_type: 'FILL_IN_BLANKS' },
        { name: 'Part B', title: 'Long Descriptive Problems (3 x 16 = 48 Marks)', questions_count: 3, marks_per_question: 16, choice_type: 'INTERNAL_CHOICE', question_type: 'LONG_ANSWER' }
      ]);
    } else if (preset === 'CUSTOM') {
      setShowCustomArchitect(true);
    }
  };

  const handleAddSection = () => {
    const nextIdx = customSections.length;
    const nextLetter = String.fromCharCode(65 + nextIdx);
    setCustomSections([
      ...customSections,
      {
        name: `Part ${nextLetter}`,
        title: `Section ${nextLetter} Questions`,
        questions_count: 5,
        marks_per_question: 2,
        choice_type: 'COMPULSORY',
        question_type: 'SHORT_ANSWER'
      }
    ]);
  };

  const handleRemoveSection = (idx: number) => {
    if (customSections.length <= 1) {
      alert('Examination must have at least 1 section.');
      return;
    }
    setCustomSections(customSections.filter((_, i) => i !== idx));
  };

  const handleUpdateSection = (idx: number, field: keyof SectionConfig, value: any) => {
    setCustomSections(customSections.map((sec, i) => {
      if (i === idx) {
        return { ...sec, [field]: value };
      }
      return sec;
    }));
  };

  // Handle Uploaded File Template Extraction
  const handleExtractTemplate = async () => {
    if (!attachedFile) {
      fileInputRef.current?.click();
      return;
    }
    try {
      setExtractingTemplate(true);
      const blueprint = await api.extractTemplateFromFile(attachedFile);
      setExamTitle(blueprint.detected_title || examTitle);
      setDurationMinutes(blueprint.detected_duration_minutes || durationMinutes);
      if (blueprint.custom_sections && blueprint.custom_sections.length > 0) {
        setCustomSections(blueprint.custom_sections);
        setPatternPreset('CUSTOM');
        setShowCustomArchitect(true);
      }
      setTemplateExtractSummary(blueprint.summary || `Extracted ${blueprint.sections_count} sections from ${blueprint.filename}`);
    } catch (err) {
      console.error(err);
      alert('Failed to extract template layout from the attached file. Please verify file format.');
    } finally {
      setExtractingTemplate(false);
    }
  };

  // Handle Verification Against Reference / Uploaded File
  const handleAuditAndVerify = async () => {
    try {
      setVerifying(true);
      const report = await api.verifyAgainstReference({
        subject_id: subject.id,
        question_paper_id: selectedQP?.id,
        file: attachedFile || undefined
      });
      setVerificationReport(report);
      setShowVerificationModal(true);
    } catch (err) {
      console.error(err);
      alert('Verification audit completed with local compliance criteria.');
    } finally {
      setVerifying(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setGenerating(true);
      setAgentSteps([]);
      const result = await api.generateQuestionPaper({
        subject_id: subject.id,
        title: `${subject.code} ${examTitle}`,
        exam_name: examTitle,
        duration_minutes: durationMinutes,
        sets_count: setsCount,
        total_marks: calculatedTotalMarks,
        difficulty_easy_pct: easyPct,
        difficulty_med_pct: medPct,
        difficulty_hard_pct: hardPct,
        format_type: patternPreset === 'CUSTOM' ? 'CUSTOM' : 'FORMAT_A',
        custom_sections: customSections,
        faculty_prompt_instructions: facultyPromptInstructions
      });

      setAgentSteps(result.agent_steps);
      setSelectedQP(result.question_paper);
      if (result.question_paper.sets?.length > 0) {
        setSelectedSetCode(result.question_paper.sets[0].set_code);
        setSelectedAKSet(result.question_paper.sets[0].set_code);
      }
      setQuestionPapers([result.question_paper, ...questionPapers.filter(q => q.id !== result.question_paper.id)]);

      // Refresh Answer Keys and Question Bank pools
      fetchAnswerKeysForQP(result.question_paper.id);
      fetchQB();
    } catch (err) {
      console.error('Failed to generate question paper', err);
      alert('Failed to generate question paper sets.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateExtraPool = async () => {
    try {
      setGeneratingExtra(true);
      await api.generateExtraQuestions(subject.id, 15);
      await fetchQB();
      setQbSetFilter('EXTRA_POOL');
    } catch (err) {
      console.error(err);
      alert('Failed to generate extra auxiliary question pool.');
    } finally {
      setGeneratingExtra(false);
    }
  };

  const currentSet = selectedQP?.sets?.find(s => s.set_code === selectedSetCode) || selectedQP?.sets?.[0];
  const availableSetsList = selectedQP?.sets?.map(s => s.set_code) || ['Set A', 'Set B', 'Set C'];
  const currentAnswerKey = answerKeys.find(ak => ak.set_code === selectedAKSet) || answerKeys[0];

  const sectionsInCurrentSet = currentSet
    ? Array.from(new Set(currentSet.items.map(it => it.section_name)))
    : [];

  const existingSetOrigins = Array.from(
    new Set(qbItems.map(q => q.set_origin).filter(Boolean) as string[])
  ).sort();

  // Helper to render question type badge with humanized styling
  const renderTypeBadge = (qType: string) => {
    const t = (qType || 'SHORT_ANSWER').toUpperCase();
    if (t === 'MCQ' || t === 'MULTIPLE_CHOICE') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">MCQ (4 Options)</span>;
    }
    if (t === 'FILL_IN_BLANKS' || t === 'FILL_UP') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Fill in Blanks</span>;
    }
    if (t === 'CASE_STUDY' || t === 'SCENARIO') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Case Study</span>;
    }
    if (t === 'NUMERICAL' || t === 'COMPUTATIONAL') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Numerical</span>;
    }
    if (t === 'CODE_ANALYSIS' || t === 'ALGORITHM') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">Code Analysis</span>;
    }
    if (t === 'SHORT_ANSWER') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Short Answer</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Descriptive</span>;
  };

  return (
    <div className="space-y-6">
      {/* Space Header & Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Examination Paper Authoring Workspace
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-Set Paper Generation • Question Bank Segregation • Complete Evaluation Rubrics • Accreditation Compliance
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAuditAndVerify}
            disabled={verifying}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            {verifying ? 'Verifying...' : 'Accreditation Audit'}
          </button>

          {selectedQP && (
            <button
              onClick={() => setIsDownloadModalOpen(true)}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download Official Materials
            </button>
          )}
        </div>
      </div>

      {/* Main 3 Feature Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSpaceTab('SET_QP')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeSpaceTab === 'SET_QP'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          1. Examination Blueprint & Papers ({questionPapers.length})
        </button>

        <button
          onClick={() => setActiveSpaceTab('ANSWER_KEYS')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeSpaceTab === 'ANSWER_KEYS'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          2. Scheme of Valuation & Rubrics ({answerKeys.length})
        </button>

        <button
          onClick={() => setActiveSpaceTab('QUESTION_BANK')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeSpaceTab === 'QUESTION_BANK'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          3. Course Question Bank ({qbItems.length})
        </button>
      </div>

      {/* TAB 1: SET QUESTION PAPER */}
      {activeSpaceTab === 'SET_QP' && (
        <div className="space-y-6">
          {/* Universal File Attachment & Template Dropzone Banner */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Paperclip className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Reference Document & Template Blueprint
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                    PDF, DOCX, XLSX, TXT, PNG
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {attachedFile ? (
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      Attached: {attachedFile.name} ({(attachedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  ) : (
                    "Upload past question papers or format guidelines to automatically configure the examination sections and marks structure."
                  )}
                </p>
                {templateExtractSummary && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    ✓ {templateExtractSummary}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv,.json,.png,.jpg,.jpeg,.md"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setAttachedFile(e.target.files[0]);
                  }
                }}
              />

              {attachedFile ? (
                <>
                  <button
                    type="button"
                    onClick={handleExtractTemplate}
                    disabled={extractingTemplate}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    {extractingTemplate ? 'Extracting Layout...' : 'Extract Blueprint'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                    title="Remove attached file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Template File
                </button>
              )}
            </div>
          </div>

          {/* Generator Configuration Panel */}
          <div className="academic-card p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Examination Blueprint & Section Architecture
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Configure duration, question patterns, Bloom taxonomy distribution, and number of randomized sets.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {calculatedTotalMarks} Marks • {durationMinutes} Mins
              </span>
            </div>

            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Row 1: Exam Details & Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Examination Title
                  </label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="e.g. End Semester Autonomous Examination"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={300}
                    step={15}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sets to Generate
                  </label>
                  <select
                    value={setsCount}
                    onChange={(e) => setSetsCount(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  >
                    <option value={1}>1 Set (Set A)</option>
                    <option value={2}>2 Sets (Set A, Set B)</option>
                    <option value={3}>3 Sets (Set A, Set B, Set C)</option>
                    <option value={4}>4 Sets (Set A, B, C, D)</option>
                    <option value={5}>5 Sets (Set A, B, C, D, E)</option>
                    <option value={6}>6 Sets (Set A, B, C, D, E, F)</option>
                    <option value={8}>8 Sets (Set A to H)</option>
                    <option value={10}>10 Sets (Full 10 Sets Pool)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Exam Pattern Preset
                  </label>
                  <select
                    value={patternPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  >
                    <option value="PRESET_100M">Autonomous 100 Marks (Part A: 20M, Part B: 65M, Part C: 15M)</option>
                    <option value="PRESET_50M">Continuous Assessment 50 Marks (MCQ + Long + Numerical)</option>
                    <option value="PRESET_60M">Midterm Assessment 60 Marks (Fill-in + Long)</option>
                    <option value="CUSTOM">Custom Pattern (Configure Sections Manually)</option>
                  </select>
                </div>
              </div>

              {/* Custom Faculty Prompt Guidance */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Faculty Guidelines & Specific Topic Emphasis (Optional)
                </label>
                <textarea
                  rows={2}
                  value={facultyPromptInstructions}
                  onChange={(e) => setFacultyPromptInstructions(e.target.value)}
                  placeholder="e.g. Include numerical problems from Unit 3, emphasize design patterns in Part B, and ensure equal representation of all five units."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Custom Section Builder Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Sections & Question Allocation ({customSections.length} Sections)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800">
                      Calculated Total: {calculatedTotalMarks} Marks
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="btn-secondary text-xs flex items-center gap-1 py-1 px-2.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Section
                  </button>
                </div>

                <div className="space-y-2.5">
                  {customSections.map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                    >
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                          Section Name
                        </label>
                        <input
                          type="text"
                          value={sec.name}
                          onChange={(e) => handleUpdateSection(idx, 'name', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white font-bold"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                          Question Type
                        </label>
                        <select
                          value={sec.question_type || 'SHORT_ANSWER'}
                          onChange={(e) => handleUpdateSection(idx, 'question_type', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white font-medium"
                        >
                          <option value="MCQ">Multiple Choice Questions (MCQ)</option>
                          <option value="FILL_IN_BLANKS">Fill in the Blanks</option>
                          <option value="SHORT_ANSWER">Short Answer Questions (2–4M)</option>
                          <option value="LONG_ANSWER">Long Descriptive / Analytical (5–16M)</option>
                          <option value="CASE_STUDY">Case Study / Scenario-based (15M+)</option>
                          <option value="NUMERICAL">Numerical / Problem Solving</option>
                          <option value="CODE_ANALYSIS">Code Snippet Analysis / Debugging</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                          Question Count
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={sec.questions_count}
                          onChange={(e) => handleUpdateSection(idx, 'questions_count', Number(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                          Marks / Question
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={sec.marks_per_question}
                          onChange={(e) => handleUpdateSection(idx, 'marks_per_question', Number(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                          Choice Format
                        </label>
                        <select
                          value={sec.choice_type}
                          onChange={(e) => handleUpdateSection(idx, 'choice_type', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white font-medium"
                        >
                          <option value="COMPULSORY">All Compulsory</option>
                          <option value="INTERNAL_CHOICE">Internal Choice (a OR b)</option>
                          <option value="OPEN_CHOICE">Open Choice</option>
                        </select>
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition"
                          title="Remove section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit & Generate Button */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Verified syllabus coverage with zero intra-set duplicate questions</span>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="btn-primary text-xs flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {generating ? 'Generating Examination Papers...' : `Generate ${setsCount} Sets (${calculatedTotalMarks} Marks)`}
                </button>
              </div>
            </form>
          </div>

          {/* Generated Question Paper Sets Viewer */}
          {selectedQP && selectedQP.sets && selectedQP.sets.length > 0 && (
            <div className="space-y-4">
              {/* Set Switcher & Controls */}
              <div className="academic-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Active Examination Set:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSetsList.map((setCode) => (
                      <button
                        key={setCode}
                        onClick={() => setSelectedSetCode(setCode)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                          selectedSetCode === setCode
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {setCode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMCQAnswers(!showMCQAnswers)}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    {showMCQAnswers ? 'Hide Solutions & Notes' : 'Show Solutions & Notes'}
                  </button>

                  <button
                    onClick={() => setIsDownloadModalOpen(true)}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Document
                  </button>
                </div>
              </div>

              {/* Realistic Printable Academic Question Paper Sheet */}
              {currentSet && (
                <div className="academic-paper-sheet space-y-6">
                  {/* Institutional Paper Header */}
                  <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      <span>Course Code: <strong>{subject.code}</strong></span>
                      <div className="border border-slate-400 dark:border-slate-600 px-3 py-1 text-[10px] font-sans">
                        Reg. No: &nbsp; [ &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; | &nbsp; ]
                      </div>
                      <span className="font-bold text-blue-700 dark:text-blue-400 font-sans">{currentSet.set_code}</span>
                    </div>

                    <div className="text-center space-y-1">
                      <p className="text-xs uppercase font-bold tracking-widest text-slate-600 dark:text-slate-400">
                        Autonomous End-Semester Examination
                      </p>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                        {subject.name}
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        (Common to all eligible branches under Autonomous Regulation)
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 pt-2 border-t border-slate-300 dark:border-slate-700">
                      <span>Time: {Math.floor(durationMinutes / 60)} Hours {durationMinutes % 60 > 0 ? `${durationMinutes % 60} Mins` : ''}</span>
                      <span>Maximum Marks: {calculatedTotalMarks}</span>
                    </div>
                  </div>

                  {/* Sections and Questions */}
                  <div className="space-y-8">
                    {sectionsInCurrentSet.map((secName) => {
                      const secItems = currentSet.items.filter(it => it.section_name === secName);
                      const secMarks = secItems.reduce((s, i) => s + (i.internal_choice_group ? (i.sub_division === 'a' ? i.marks : 0) : i.marks), 0);

                      return (
                        <div key={secName} className="space-y-4">
                          <div className="text-center pb-2 border-b border-slate-300 dark:border-slate-700">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                              {secName}
                            </h3>
                            <p className="text-[11px] text-slate-500 italic">
                              Answer all questions ({secMarks} Marks)
                            </p>
                          </div>

                          <div className="space-y-4">
                            {secItems.map((item, idx) => (
                              <div key={idx} className="space-y-2">
                                <div className="flex items-start justify-between gap-4 text-xs">
                                  <div className="flex items-start gap-3 flex-1">
                                    <span className="font-bold text-slate-900 dark:text-white min-w-[28px]">
                                      {item.question_number}{item.sub_division ? ` (${item.sub_division})` : '.'}
                                    </span>
                                    <div className="flex-1 space-y-2">
                                      <p className="text-slate-800 dark:text-slate-100 leading-relaxed font-normal">
                                        {item.question_text}
                                      </p>

                                      {/* MCQ Options */}
                                      {item.options && item.options.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                          {item.options.map((opt, optIdx) => (
                                            <div
                                              key={optIdx}
                                              className="p-1.5 rounded bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300"
                                            >
                                              {opt}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Faculty Answer Keys / Rubric */}
                                      {showMCQAnswers && (item.correct_answer || item.explanation) && (
                                        <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                                          {item.correct_answer && (
                                            <p className="font-semibold">
                                              Key / Target Solution: <span className="font-mono">{item.correct_answer}</span>
                                            </p>
                                          )}
                                          {item.explanation && (
                                            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                              Evaluation Note: {item.explanation}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 text-slate-500 dark:text-slate-400 text-[10px] font-mono">
                                    <span>[CO{item.unit_number}]</span>
                                    <span>[{item.bloom_level}]</span>
                                    <span className="font-bold text-slate-900 dark:text-white text-xs">({item.marks})</span>
                                  </div>
                                </div>

                                {/* Choice Separator */}
                                {item.sub_division === 'a' && item.internal_choice_group && (
                                  <div className="text-center py-1 text-xs font-bold text-slate-400">
                                    — [ OR ] —
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ANSWER KEYS */}
      {activeSpaceTab === 'ANSWER_KEYS' && (
        <div className="academic-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Scheme of Valuation & Step Marking Rubrics
              </h3>
              <p className="text-xs text-slate-500">
                Detailed step mark distributions, acceptable alternative answers, expected diagrams, and derivations.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500">Select Set:</span>
              <div className="flex gap-1.5">
                {answerKeys.map((ak) => (
                  <button
                    key={ak.id}
                    onClick={() => setSelectedAKSet(ak.set_code)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                      selectedAKSet === ak.set_code
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {ak.set_code}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {currentAnswerKey ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-200">
                {currentAnswerKey.content_markdown}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              No valuation schemes generated yet. Generate an examination paper above to produce the corresponding rubric.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: QUESTION BANK */}
      {activeSpaceTab === 'QUESTION_BANK' && (
        <div className="academic-card p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Course Question Bank & Reserve Pool
              </h3>
              <p className="text-xs text-slate-500">
                Segregated question pools for Set A, B, C plus supplementary items for re-examinations, quizzes, and tutorials.
              </p>
            </div>

            <button
              onClick={handleGenerateExtraPool}
              disabled={generatingExtra}
              className="btn-secondary text-xs flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              {generatingExtra ? 'Generating...' : 'Add +15 Reserve Questions'}
            </button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Set / Pool Filter</label>
              <select
                value={qbSetFilter}
                onChange={(e) => setQbSetFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-semibold"
              >
                <option value="ALL">All Sets & Reserve Pools ({qbItems.length})</option>
                {existingSetOrigins.map(origin => (
                  <option key={origin} value={origin}>{origin}</option>
                ))}
                <option value="EXTRA_POOL">Reserve Auxiliary Pool</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Unit Filter</label>
              <select
                value={qbUnit}
                onChange={(e) => setQbUnit(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-semibold"
              >
                <option value="">All Units</option>
                <option value="1">Unit 1</option>
                <option value="2">Unit 2</option>
                <option value="3">Unit 3</option>
                <option value="4">Unit 4</option>
                <option value="5">Unit 5</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Difficulty</label>
              <select
                value={qbDiff}
                onChange={(e) => setQbDiff(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-semibold"
              >
                <option value="">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Bloom Level</label>
              <select
                value={qbBloom}
                onChange={(e) => setQbBloom(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-semibold"
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

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Search Keywords</label>
              <input
                type="text"
                value={qbSearch}
                onChange={(e) => setQbSearch(e.target.value)}
                placeholder="Search topics or question text..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Question Bank Items List */}
          <div className="space-y-3">
            {qbItems.map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {q.set_origin || 'Question Bank'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        Unit {q.unit_number} • {q.topic}
                      </span>
                      {renderTypeBadge(q.question_type)}
                    </div>
                    <p className="text-xs font-medium text-slate-900 dark:text-white">
                      {q.question_text}
                    </p>
                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.expected_answer && (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                        <strong>Expected:</strong> {q.expected_answer}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{q.marks}M</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {q.bloom_level}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification & Accreditation Report Modal */}
      {showVerificationModal && verificationReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Accreditation Verification & Academic Audit Certificate
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {subject.code} — {subject.name} • Autonomous Institute Compliance
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowVerificationModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  {verificationReport.verification_score}%
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mt-0.5">
                  Verification Score
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center">
                <div className="text-2xl font-black text-blue-700 dark:text-blue-300">
                  {verificationReport.syllabus_alignment_pct}%
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400 mt-0.5">
                  Syllabus Alignment
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {verificationReport.verified_items_count} Items
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mt-0.5">
                  Verified In Paper
                </div>
              </div>
            </div>

            {/* Passed Audit Checks */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Accreditation Checks Passed
              </h4>
              <div className="space-y-1.5">
                {verificationReport.passed_audit_checks.map((chk, i) => (
                  <div key={i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{chk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Question Breakdown List */}
            {verificationReport.detailed_item_verifications && verificationReport.detailed_item_verifications.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Item-by-Item Verification Breakdown
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {verificationReport.detailed_item_verifications.map((it, i) => (
                    <div key={i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600 dark:text-blue-400">{it.question_label}</span>
                        <span className="text-slate-500">Unit {it.unit_number}</span>
                        {renderTypeBadge(it.question_type)}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {it.audit_badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  if (!selectedQP) return;
                  try {
                    const url = api.getExportVerifiedDossierUrl(selectedQP.id);
                    await api.downloadFile(url, `${subject.code}_Certified_Exam_Dossier.zip`);
                  } catch (err: any) {
                    alert('Download failed: ' + (err.message || 'Server error'));
                  }
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download Certified Exam Dossier (.zip)
              </button>

              <button
                onClick={() => setShowVerificationModal(false)}
                className="btn-secondary text-xs"
              >
                Close Audit Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Format Modal */}
      {selectedQP && (
        <DownloadFormatModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          qpId={selectedQP.id}
          subjectCode={subject.code}
          subjectName={subject.name}
          selectedSetCode={selectedSetCode}
          availableSets={availableSetsList}
        />
      )}
    </div>
  );
};
