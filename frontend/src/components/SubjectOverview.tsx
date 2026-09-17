import React from 'react';
import { Subject } from '../types';
import { 
  BookOpen, FileSpreadsheet, FileText, CheckCircle2, 
  Layers, ArrowRight, ShieldCheck, Clock, Award, CheckSquare, Edit3
} from 'lucide-react';

interface SubjectOverviewProps {
  subject: Subject;
  onNavigate: (tab: any) => void;
  onEditSubject?: () => void;
}

export const SubjectOverview: React.FC<SubjectOverviewProps> = ({ subject, onNavigate, onEditSubject }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Subject Header Banner */}
      <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 lg:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {subject.code}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Regulation {subject.regulation}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Semester {subject.semester} • Academic Year {subject.academic_year}
            </span>
          </div>

          {onEditSubject && (
            <button
              onClick={onEditSubject}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition self-start md:self-auto shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Edit Course Syllabus
            </button>
          )}
        </div>

        <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
          {subject.name}
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-sm max-w-3xl leading-relaxed mb-6">
          {subject.description || "Core engineering autonomous syllabus with complete Unit-wise lecture notes, multi-set question paper generators, and step-marking evaluation rubrics."}
        </p>

        {/* Primary Faculty Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <button
            onClick={() => onNavigate('QUESTION_PAPERS')}
            className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 border border-blue-200/80 dark:border-blue-800/80 text-left transition group shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="text-xs font-bold text-blue-950 dark:text-blue-100 mb-0.5">Exam Paper Suite</h4>
            <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 leading-snug">
              Generate 1–10 parallel sets with MCQs & case studies
            </p>
          </button>

          <button
            onClick={() => onNavigate('NOTES')}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-left transition group shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">Lecture Notes</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Unit-wise handouts, exam points & formulas
            </p>
          </button>

          <button
            onClick={() => onNavigate('ANSWER_KEYS')}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-left transition group shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">Marking Schemes</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Step-by-step evaluator rubric guidelines
            </p>
          </button>

          <button
            onClick={() => onNavigate('OBE')}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-left transition group shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">NBA / OBE Matrix</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              5×15 CO-PO mapping & accreditation export
            </p>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Syllabus Coverage</span>
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {subject.units?.length || 5} Units
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Curriculum Verified
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Course Vault Files</span>
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {subject.document_count || 0} Files
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Syllabus, Textbook Chapters & Notes
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Examination Sets</span>
            <FileSpreadsheet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {subject.question_paper_count || 0} Sets Ready
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Parallel question papers generated
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cognitive Spectrum</span>
            <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Bloom L1–L6
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Balanced difficulty distribution
          </p>
        </div>
      </div>

      {/* Units & Syllabus Breakdown */}
      <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Syllabus Units & Module Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Autonomous Institute Curriculum Modules
            </p>
          </div>
          <button 
            onClick={() => onNavigate('NOTES')}
            className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold flex items-center gap-1"
          >
            Create Notes <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {(subject.units || []).map((u) => (
            <div 
              key={u.unit_number} 
              className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2.5">
                  <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                    {u.unit_number}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {u.title}
                  </h4>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {u.hours || 9} Hours
                  </span>
                  <button
                    onClick={() => onNavigate('NOTES')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 transition shadow-xs"
                  >
                    Open Notes
                  </button>
                </div>
              </div>

              {/* Topic tags */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(u.topics || []).map((topic, tIdx) => (
                  <span 
                    key={tIdx} 
                    className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
