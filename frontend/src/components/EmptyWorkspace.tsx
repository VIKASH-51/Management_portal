import React from 'react';
import { 
  BookOpen, Plus, Sparkles, FileSpreadsheet, Eye, 
  Brain, FileText, CheckCircle2, ArrowRight, Layers 
} from 'lucide-react';

interface EmptyWorkspaceProps {
  onCreateCourse: () => void;
  onNavigateTab: (tab: any) => void;
}

export const EmptyWorkspace: React.FC<EmptyWorkspaceProps> = ({ 
  onCreateCourse,
  onNavigateTab 
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-slate-50 dark:from-slate-900 dark:via-indigo-950/60 dark:to-slate-900 border border-slate-200 dark:border-slate-800 p-8 lg:p-10 shadow-2xl transition-colors duration-200">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Database Initialized — 0 Sample Data (Empty DB)</span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Welcome to AI Academic Assistant
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Your workspace is completely clean. Provide your own course syllabus, upload question papers, or click below to initialize your first subject workspace.
          </p>

          <div className="pt-2 flex flex-wrap gap-4">
            <button
              onClick={onCreateCourse}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-2.5 shadow-xl shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Course / Subject</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigateTab('LEARNING')}
              className="px-5 py-3 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm"
            >
              <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Explore Self-Learning Memory</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Capabilities Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Autonomous Multi-Agent Capabilities (Ready for Your Input)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Notes Studio */}
          <div className="academic-glass bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Humanized Lecture Notes</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Generates unit-wise notes with dynamic Mermaid flowcharts, real-world analogies, and student mistake callouts.
            </p>
          </div>

          {/* Card 2: Question Papers */}
          <div className="academic-glass bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Multi-Set Exam Papers</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Create 1 to 10 balanced question sets with custom Bloom's taxonomy weights and guaranteed 0% cross-set duplicates.
            </p>
          </div>

          {/* Card 3: Vision OCR */}
          <div className="academic-glass bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Multimodal Vision OCR</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload handwritten question papers, circuit schematics, and ER models to instantly extract structured questions.
            </p>
          </div>

          {/* Card 4: Learning Memory */}
          <div className="academic-glass bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Self-Learning Memory</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Autonomous agent continuously learns from live academic searches, retaining pedagogical feedback across sessions.
            </p>
          </div>

          {/* Card 5: Documents RAG */}
          <div className="academic-glass bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Syllabus & RAG Vault</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              High-accuracy document ingestion for syllabus PDFs, reference textbooks, and past autonomous exam papers.
            </p>
          </div>

          {/* Card 6: Create Course CTA */}
          <div 
            onClick={onCreateCourse}
            className="academic-glass bg-indigo-50/60 dark:bg-indigo-950/20 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/40 cursor-pointer transition flex flex-col justify-center items-center text-center space-y-2 group p-5 rounded-2xl"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-110 transition">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">Get Started Now</h3>
            <p className="text-xs text-indigo-600 dark:text-indigo-300">Click to input course details</p>
          </div>
        </div>
      </div>
    </div>
  );
};
