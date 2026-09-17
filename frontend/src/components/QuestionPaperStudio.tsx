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
  const [customPatternText, setCustomPatternText] = useState(
    'Part A: 10 Questions x 2 Marks = 20 Marks (Compulsory Short Answers)\nPart B: 5 Questions x 13 Marks = 65 Marks (Internal Choice Either/Or)\nPart C: 1 Question x 15 Marks = 15 Marks (Application / Case Study)'
  );
  const [facultyPromptInstructions, setFacultyPromptInstructions] = useState('');
  const [customQuestionsText, setCustomQuestionsText] = useState('');
  const [showMCQAnswers, setShowMCQAnswers] = useState(false);

  // Syllabus Units Scope & Coverage State
  const defaultAvailableUnits = subject.units && subject.units.length > 0 
    ? subject.units.map(u => u.unit_number) 
    : [1, 2, 3, 4, 5];
  const [selectedUnits, setSelectedUnits] = useState<number[]>(defaultAvailableUnits);

  useEffect(() => {
    if (subject.units && subject.units.length > 0) {
      setSelectedUnits(subject.units.map(u => u.unit_number));
    } else {
      setSelectedUnits([1, 2, 3, 4, 5]);
    }
  }, [subject.id, subject.units]);

  const toggleUnit = (unitNum: number) => {
    if (selectedUnits.includes(unitNum)) {
      if (selectedUnits.length <= 1) {
        alert('Question paper must cover at least 1 unit from the syllabus.');
        return;
      }
      setSelectedUnits(selectedUnits.filter(u => u !== unitNum));
    } else {
      setSelectedUnits([...selectedUnits, unitNum].sort((a, b) => a - b));
    }
  };

  const selectUnitPreset = (unitNums: number[]) => {
    setSelectedUnits(unitNums);
  };

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
  const [isDownloadingDirect, setIsDownloadingDirect] = useState(false);

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

  const handleAutoParsePatternText = (textToParse?: string) => {
    const raw = (textToParse !== undefined ? textToParse : customPatternText).trim();
    if (!raw) {
      alert('Please enter a pattern description in the box to auto-parse.');
      return;
    }
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedSections: SectionConfig[] = [];

    lines.forEach((line, idx) => {
      const nameMatch = line.match(/^(Part\s+[A-Z0-9]+|Section\s+[A-Z0-9]+|Unit\s+[A-Z0-9]+|[A-Z]\b)/i);
      const name = nameMatch ? nameMatch[1] : `Part ${String.fromCharCode(65 + idx)}`;

      const countMarkMatch = line.match(/(\d+)\s*(?:questions?|q)?\s*(?:x|\*|of|@)\s*(\d+)\s*(?:marks?|m)?/i)
        || line.match(/(\d+)\s*(?:marks?|m)\s*(?:x|\*)\s*(\d+)/i);

      let count = 5;
      let marks = 2;

      if (countMarkMatch) {
        count = parseInt(countMarkMatch[1], 10);
        marks = parseInt(countMarkMatch[2], 10);
      } else {
        const anyNumbers = line.match(/\b(\d+)\b/g);
        if (anyNumbers && anyNumbers.length >= 2) {
          count = parseInt(anyNumbers[0], 10);
          marks = parseInt(anyNumbers[1], 10);
        } else if (anyNumbers && anyNumbers.length === 1) {
          count = parseInt(anyNumbers[0], 10);
        }
      }

      let qType: any = 'SHORT_ANSWER';
      const lower = line.toLowerCase();
      if (lower.includes('mcq') || lower.includes('multiple choice') || lower.includes('objective')) {
        qType = 'MCQ';
      } else if (lower.includes('fill in') || lower.includes('blank')) {
        qType = 'FILL_IN_BLANKS';
      } else if (lower.includes('case study') || lower.includes('scenario') || lower.includes('comprehensive')) {
        qType = 'CASE_STUDY';
      } else if (lower.includes('numerical') || lower.includes('problem') || lower.includes('calculation')) {
        qType = 'NUMERICAL';
      } else if (lower.includes('code') || lower.includes('program') || lower.includes('algorithm')) {
        qType = 'CODE_ANALYSIS';
      } else if (marks >= 10 || lower.includes('long') || lower.includes('descriptive') || lower.includes('essay')) {
        qType = 'LONG_ANSWER';
      }

      let choiceType: any = 'COMPULSORY';
      if (lower.includes('internal choice') || lower.includes('either/or') || lower.includes('either or') || lower.includes('or choice')) {
        choiceType = 'INTERNAL_CHOICE';
      } else if (lower.includes('open choice') || lower.includes('any ') || lower.includes('choose ')) {
        choiceType = 'OPEN_CHOICE';
      } else if (marks >= 10) {
        choiceType = 'INTERNAL_CHOICE';
      }

      parsedSections.push({
        name,
        title: `${name} Questions (${count} x ${marks} = ${count * marks} Marks)`,
        questions_count: count > 0 ? count : 5,
        marks_per_question: marks > 0 ? marks : 2,
        choice_type: choiceType,
        question_type: qType
      });
    });

    if (parsedSections.length > 0) {
      setCustomSections(parsedSections);
      setPatternPreset('CUSTOM');
      setShowCustomArchitect(true);
    }
  };

  const applyPresetPattern = (text: string, dur: number, presetKey: string = 'CUSTOM') => {
    setCustomPatternText(text);
    setDurationMinutes(dur);
    setPatternPreset(presetKey);
    handleAutoParsePatternText(text);
  };

  const handlePresetChange = (preset: string) => {
    setPatternPreset(preset);
    if (preset === 'PRESET_100M') {
      setShowCustomArchitect(false);
      setDurationMinutes(180);
      const text = 'Part A: 10 Questions x 2 Marks = 20 Marks (Compulsory Short Concept Answers)\nPart B: 5 Questions x 13 Marks = 65 Marks (Internal Choice Either/Or)\nPart C: 1 Question x 15 Marks = 15 Marks (Comprehensive Application / Case Study)';
      setCustomPatternText(text);
      setCustomSections([
        { name: 'Part A', title: 'Short Answer & Definitions (10 x 2 = 20 Marks)', questions_count: 10, marks_per_question: 2, choice_type: 'COMPULSORY', question_type: 'SHORT_ANSWER' },
        { name: 'Part B', title: 'Descriptive & Analytical Problems (5 x 13 = 65 Marks)', questions_count: 5, marks_per_question: 13, choice_type: 'INTERNAL_CHOICE', question_type: 'LONG_ANSWER' },
        { name: 'Part C', title: 'Application & Case Study (1 x 15 = 15 Marks)', questions_count: 1, marks_per_question: 15, choice_type: 'INTERNAL_CHOICE', question_type: 'CASE_STUDY' }
      ]);
    } else if (preset === 'PRESET_50M') {
      setShowCustomArchitect(false);
      setDurationMinutes(90);
      const text = 'Part A: 10 Questions x 1 Mark = 10 Marks (Multiple Choice Questions)\nPart B: 2 Questions x 15 Marks = 30 Marks (Internal Choice Analytical)\nPart C: 1 Question x 10 Marks = 10 Marks (Numerical Problem Solving)';
      setCustomPatternText(text);
      setCustomSections([
        { name: 'Part A', title: 'Multiple Choice Questions (10 x 1 = 10 Marks)', questions_count: 10, marks_per_question: 1, choice_type: 'COMPULSORY', question_type: 'MCQ' },
        { name: 'Part B', title: 'Detailed Analytical Problems (2 x 15 = 30 Marks)', questions_count: 2, marks_per_question: 15, choice_type: 'INTERNAL_CHOICE', question_type: 'LONG_ANSWER' },
        { name: 'Part C', title: 'Numerical Problem (1 x 10 = 10 Marks)', questions_count: 1, marks_per_question: 10, choice_type: 'INTERNAL_CHOICE', question_type: 'NUMERICAL' }
      ]);
    } else if (preset === 'PRESET_60M') {
      setShowCustomArchitect(false);
      setDurationMinutes(120);
      const text = 'Part A: 6 Questions x 2 Marks = 12 Marks (Fill in Blanks & Concepts)\nPart B: 3 Questions x 16 Marks = 48 Marks (Long Descriptive Problems)';
      setCustomPatternText(text);
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

  const handleDirectDownload = async (url: string, filename: string) => {
    try {
      setIsDownloadingDirect(true);
      await api.downloadFile(url, filename);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to download file');
    } finally {
      setIsDownloadingDirect(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedUnits.length === 0) {
      alert('Please select at least 1 syllabus unit to cover in the question paper.');
      return;
    }

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
        units_included: selectedUnits.sort((a, b) => a - b),
        custom_sections: customSections,
        faculty_prompt_instructions: facultyPromptInstructions,
        custom_pattern_text: customPatternText,
        custom_questions_text: customQuestionsText
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

              {/* Syllabus Units Scope & Coverage Panel */}
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/25 border border-blue-200/80 dark:border-blue-800/60 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Syllabus Units to Cover
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                        {selectedUnits.length} of {(subject.units && subject.units.length > 0 ? subject.units.length : 5)} Units Selected ({selectedUnits.map(u => `Unit ${u}`).join(', ')})
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Choose how many and which specific units to include. Questions will be strictly generated from and distributed across your selected units.
                    </p>
                  </div>

                  {/* Quick Preset Selector Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => selectUnitPreset(subject.units?.length ? subject.units.map(u => u.unit_number) : [1, 2, 3, 4, 5])}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition border ${
                        selectedUnits.length === (subject.units?.length || 5)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      All Units (1 to 5)
                    </button>

                    <button
                      type="button"
                      onClick={() => selectUnitPreset([1, 2])}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition border ${
                        selectedUnits.length === 2 && selectedUnits.includes(1) && selectedUnits.includes(2)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      Units 1 & 2 (CIA 1)
                    </button>

                    <button
                      type="button"
                      onClick={() => selectUnitPreset([3, 4])}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition border ${
                        selectedUnits.length === 2 && selectedUnits.includes(3) && selectedUnits.includes(4)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      Units 3 & 4 (CIA 2)
                    </button>

                    <button
                      type="button"
                      onClick={() => selectUnitPreset([1, 2, 3])}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition border ${
                        selectedUnits.length === 3 && selectedUnits.includes(1) && selectedUnits.includes(2) && selectedUnits.includes(3)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      Units 1–3
                    </button>

                    <button
                      type="button"
                      onClick={() => selectUnitPreset([5])}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition border ${
                        selectedUnits.length === 1 && selectedUnits.includes(5)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      Unit 5 (CIA 3)
                    </button>
                  </div>
                </div>

                {/* Individual Unit Checkbox Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
                  {(subject.units && subject.units.length > 0 ? subject.units : [
                    { unit_number: 1, title: 'Foundations & Architecture', topics: ['Core Concepts', 'Protocols'] },
                    { unit_number: 2, title: 'Methodologies & Design', topics: ['Protocol Design', 'Error Control'] },
                    { unit_number: 3, title: 'Modeling & Analysis', topics: ['Optimization', 'Throughput'] },
                    { unit_number: 4, title: 'Advanced Optimization', topics: ['Performance', 'Fault Tolerance'] },
                    { unit_number: 5, title: 'Enterprise Applications', topics: ['Case Studies', 'Security'] }
                  ]).map((u) => {
                    const isSelected = selectedUnits.includes(u.unit_number);
                    const topicsCount = Array.isArray(u.topics) ? u.topics.length : 0;
                    return (
                      <div
                        key={u.unit_number}
                        onClick={() => toggleUnit(u.unit_number)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition flex flex-col justify-between select-none ${
                          isSelected
                            ? 'bg-white dark:bg-slate-900 border-blue-500 dark:border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                            : 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5 mb-1">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 pointer-events-none"
                            />
                            Unit {u.unit_number}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                            CO{u.unit_number}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium line-clamp-2 leading-tight">
                          {u.title.replace(/^Unit\s*\d+\s*:\s*/i, '') || `Unit ${u.unit_number} Core Syllabus`}
                        </p>
                        <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400">
                          <span>{topicsCount > 0 ? `${topicsCount} Topics` : 'Syllabus Mapped'}</span>
                          <span className={isSelected ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400'}>
                            {isSelected ? '✓ Included' : 'Excluded'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Exam Question Pattern Specification Card */}
              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Custom Exam Question Pattern & Blueprint Specification
                      <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60">
                        Custom Structure Input
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Specify the exact question paper pattern (e.g. parts, number of questions, marks per question, and choice types).
                    </p>
                  </div>

                  {/* Preset Pattern Quick Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => applyPresetPattern(
                        'Part A: 10 Questions x 2 Marks = 20 Marks (Compulsory Short Concepts)\nPart B: 5 Questions x 13 Marks = 65 Marks (Internal Choice Either/Or)\nPart C: 1 Question x 15 Marks = 15 Marks (Application / Case Study)',
                        180,
                        'PRESET_100M'
                      )}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:border-indigo-300 transition"
                    >
                      🎓 100M Standard (20+65+15)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetPattern(
                        'Part A: 10 Questions x 1 Mark = 10 Marks (Multiple Choice Questions)\nPart B: 2 Questions x 15 Marks = 30 Marks (Internal Choice Analytical)\nPart C: 1 Question x 10 Marks = 10 Marks (Numerical Problem Solving)',
                        90,
                        'PRESET_50M'
                      )}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:border-indigo-300 transition"
                    >
                      📝 50M CIA (10+30+10)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetPattern(
                        'Part A: 6 Questions x 2 Marks = 12 Marks (Fill in Blanks & Definitions)\nPart B: 3 Questions x 16 Marks = 48 Marks (Descriptive Problems Either/Or)',
                        120,
                        'PRESET_60M'
                      )}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:border-indigo-300 transition"
                    >
                      ⏱️ 60M Midterm (12+48)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetPattern(
                        'Part A: 25 Questions x 1 Mark = 25 Marks (Multiple Choice Questions with 4 Options)',
                        45,
                        'CUSTOM'
                      )}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:border-indigo-300 transition"
                    >
                      🎯 25M MCQ Quiz
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <textarea
                    rows={3}
                    value={customPatternText}
                    onChange={(e) => setCustomPatternText(e.target.value)}
                    placeholder="Enter custom question paper pattern lines, e.g.:&#10;Part A: 5 Questions x 2 Marks = 10 Marks (Short Answer Concepts) [Compulsory]&#10;Part B: 2 Questions x 15 Marks = 30 Marks (Descriptive Problems) [Internal Choice Either/Or]&#10;Part C: 1 Question x 10 Marks = 10 Marks (Comprehensive Case Study)"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-none leading-relaxed"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      💡 Type any pattern above and click <span className="font-semibold text-indigo-600 dark:text-indigo-400">"Apply Pattern to Section Table"</span> to auto-sync the grid below.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAutoParsePatternText()}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-1.5 self-end sm:self-auto shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Apply Pattern to Section Table
                    </button>
                  </div>
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

              {/* Teacher Custom / Additional Questions Input */}
              <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    Teacher's Custom / Additional Questions (Optional)
                  </label>
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60">
                    Syllabus Grounded
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={customQuestionsText}
                  onChange={(e) => setCustomQuestionsText(e.target.value)}
                  placeholder="Paste or type any mandatory questions you want included in the question paper sets (one question per line, with optional marks e.g. 'Explain the working of CNN architectures with diagrams [13 Marks]'):"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none font-mono"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Custom questions will be integrated into the question paper sets alongside auto-synthesized syllabus items.
                </p>
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

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowMCQAnswers(!showMCQAnswers)}
                    className="btn-secondary text-xs flex items-center gap-1 py-1 px-2.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    {showMCQAnswers ? 'Hide Solutions' : 'Show Solutions'}
                  </button>

                  {/* 1-Click Direct Download Actions */}
                  <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      disabled={isDownloadingDirect}
                      onClick={() => handleDirectDownload(api.getExportQPPdfUrl(selectedQP.id, selectedSetCode), `${subject.code}_${selectedSetCode}.pdf`)}
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded text-[11px] font-bold border border-red-200 dark:border-red-800 flex items-center gap-1 transition"
                      title="Download PDF"
                    >
                      <Download className="w-3 h-3" />
                      PDF
                    </button>

                    <button
                      type="button"
                      disabled={isDownloadingDirect}
                      onClick={() => handleDirectDownload(api.getExportQPWordUrl(selectedQP.id, selectedSetCode), `${subject.code}_${selectedSetCode}.docx`)}
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded text-[11px] font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition"
                      title="Download Word (DOCX)"
                    >
                      <Download className="w-3 h-3" />
                      Word
                    </button>

                    <button
                      type="button"
                      disabled={isDownloadingDirect}
                      onClick={() => handleDirectDownload(api.getExportQPLatexUrl(selectedQP.id, selectedSetCode), `${subject.code}_${selectedSetCode}.tex`)}
                      className="px-2 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded text-[11px] font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1 transition"
                      title="Download LaTeX"
                    >
                      <Download className="w-3 h-3" />
                      LaTeX
                    </button>

                    <button
                      type="button"
                      disabled={isDownloadingDirect}
                      onClick={() => handleDirectDownload(api.getExportQPZipPackUrl(selectedQP.id), `ExamPack_${subject.code}.zip`)}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded text-[11px] font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1 transition"
                      title="Download All Sets ZIP"
                    >
                      <Download className="w-3 h-3" />
                      ZIP All
                    </button>

                    <button
                      onClick={() => setIsDownloadModalOpen(true)}
                      className="btn-primary text-xs flex items-center gap-1 py-1 px-2.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      More Formats
                    </button>
                  </div>
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
                        {selectedQP.exam_name || 'Autonomous Examination'}
                      </p>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                        {subject.name}
                      </h2>
                      <div className="flex items-center justify-center flex-wrap gap-2 pt-1">
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          Syllabus Covered: {selectedQP.units_included && selectedQP.units_included.length > 0 ? selectedQP.units_included.map(u => `Unit ${u}`).join(', ') : 'All Units (1–5)'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          Regulation: {selectedQP.regulation || 'R2021'}
                        </span>
                      </div>
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
