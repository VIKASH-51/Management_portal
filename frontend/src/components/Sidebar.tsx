import React from 'react';
import { 
  LayoutDashboard, FileText, BookOpen, FileSpreadsheet, 
  CheckSquare, Database, TrendingUp, Compass, ShieldCheck,
  Camera, Brain, Award, MessageSquare, Library, CheckCircle2
} from 'lucide-react';
import { User } from '../types';

export type TabType = 
  | 'CHATBOT'
  | 'OVERVIEW'
  | 'OBE'
  | 'DOCUMENTS'
  | 'NOTES'
  | 'QUESTION_PAPERS'
  | 'VISION'
  | 'LEARNING'
  | 'ANSWER_KEYS'
  | 'QUESTION_BANK'
  | 'TRENDS'
  | 'RESEARCH'
  | 'ADMIN';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  currentUser: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser
}) => {
  const isElevated = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const coursewareItems = [
    { id: 'OVERVIEW' as TabType, label: 'Course Overview', icon: LayoutDashboard, badge: null },
    { id: 'QUESTION_PAPERS' as TabType, label: 'Exam Paper Creator', icon: FileSpreadsheet, badge: '1-10 Sets' },
    { id: 'NOTES' as TabType, label: 'Lecture Notes & Handouts', icon: BookOpen, badge: null },
    { id: 'ANSWER_KEYS' as TabType, label: 'Marking Schemes & Rubrics', icon: CheckSquare, badge: null },
    { id: 'QUESTION_BANK' as TabType, label: 'Course Question Bank', icon: Database, badge: null },
    { id: 'OBE' as TabType, label: 'OBE & NBA Matrix', icon: Award, badge: 'CO-PO' },
  ];

  const toolItems = [
    { id: 'DOCUMENTS' as TabType, label: 'Syllabus & Course Vault', icon: FileText, badge: null },
    { id: 'CHATBOT' as TabType, label: 'Curriculum Assistant', icon: MessageSquare, badge: null },
    { id: 'TRENDS' as TabType, label: '5-Yr Exam Trend Analyzer', icon: TrendingUp, badge: null },
    { id: 'VISION' as TabType, label: 'Diagram Digitizer & OCR', icon: Camera, badge: null },
    { id: 'LEARNING' as TabType, label: 'Teaching Style & Memory', icon: Brain, badge: null },
    { id: 'RESEARCH' as TabType, label: 'References & Literature', icon: Compass, badge: null },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-3.5 h-[calc(100vh-4rem)] sticky top-16 shrink-0 overflow-y-auto transition-colors duration-200 shadow-xs">
      <div className="space-y-5">
        {/* Courseware & Examination Group */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Courseware & Examination
          </p>
          <nav className="space-y-0.5">
            {coursewareItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-blue-800 text-white font-semibold dark:bg-blue-700 shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                      isActive 
                        ? 'bg-blue-900/60 text-blue-100' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Faculty Tools & Resources */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Faculty Tools & Resources
          </p>
          <nav className="space-y-0.5">
            {toolItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-blue-800 text-white font-semibold dark:bg-blue-700 shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Administration Section */}
        {isElevated && (
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Administration
            </p>
            <button
              onClick={() => onSelectTab('ADMIN')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === 'ADMIN'
                  ? 'bg-amber-800 text-white font-semibold shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Dean / Admin Portal</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Institutional Compliance Badge */}
      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 transition-colors">
        <div className="flex items-center space-x-1.5 mb-1 text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>NBA / NAAC Tier-I Standard</span>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
          Autonomous Examination Cell format compliant with Bloom's Taxonomy & CO-PO Articulation.
        </p>
      </div>
    </aside>
  );
};
