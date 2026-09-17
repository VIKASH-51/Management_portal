import React from 'react';
import { Subject, User, Role } from '../types';
import { useTheme } from '../context/ThemeContext';
import { 
  GraduationCap, Shield, UserCheck, BookOpen, 
  Layers, Plus, ChevronDown, LogOut, Sun, Moon,
  HelpCircle, MessageSquare
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  subjects: Subject[];
  selectedSubject: Subject | null;
  onSelectSubject: (s: Subject) => void;
  onSwitchRole?: (role: Role) => void;
  onToggleCopilot: () => void;
  isCopilotOpen: boolean;
  onOpenCreateCourse: () => void;
  onOpenEditCourse?: () => void;
  onOpenProfileModal?: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  subjects,
  selectedSubject,
  onSelectSubject,
  onSwitchRole,
  onToggleCopilot,
  isCopilotOpen,
  onOpenCreateCourse,
  onOpenEditCourse,
  onOpenProfileModal,
  onLogout
}) => {
  const { theme, toggleTheme } = useTheme();

  const getRoleBadge = (role?: string) => {
    if (role === 'SUPER_ADMIN') {
      return (
        <span className="px-2.5 py-1 text-[11px] rounded-lg font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 shadow-xs">
          <Layers className="w-3.5 h-3.5" />
          <span>Super Admin</span>
        </span>
      );
    }
    if (role === 'ADMIN') {
      return (
        <span className="px-2.5 py-1 text-[11px] rounded-lg font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 shadow-xs">
          <Shield className="w-3.5 h-3.5" />
          <span>Dean Office (Admin)</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-[11px] rounded-lg font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 shadow-xs">
        <UserCheck className="w-3.5 h-3.5" />
        <span>Faculty</span>
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between transition-colors duration-200 shadow-xs">
      {/* Institutional Emblem & Title */}
      <div className="flex items-center space-x-3.5">
        <div className="w-9 h-9 rounded-lg bg-blue-900 dark:bg-blue-800 flex items-center justify-center text-white shadow-xs">
          <GraduationCap className="w-5 h-5 text-blue-100" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Autonomous Examination & Courseware Portal
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Institutional Academic System
              </span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Autonomous Institute of Technology & Science • Examination Cell & Curriculum Division
          </p>
        </div>
      </div>

      {/* Course Switcher & Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* + Add Course Button */}
        <button
          onClick={onOpenCreateCourse}
          title="Create New Course / Syllabus"
          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline">Add Course</span>
        </button>

        {/* Active Course Selector */}
        <div className="relative group">
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer transition shadow-xs">
            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold max-w-[120px] sm:max-w-[200px] truncate">
              {selectedSubject ? `${selectedSubject.code}: ${selectedSubject.name}` : (subjects.length > 0 ? 'Select Course' : 'No Courses Available')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="absolute right-0 mt-1.5 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 hidden group-hover:block z-50 animate-in fade-in duration-150">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>Assigned Courses</span>
              <div className="flex items-center space-x-2">
                {selectedSubject && onOpenEditCourse && (
                  <button
                    onClick={onOpenEditCourse}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                  >
                    Edit Syllabus
                  </button>
                )}
                <button 
                  onClick={onOpenCreateCourse}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  + Add New
                </button>
              </div>
            </div>
            
            {subjects.length === 0 ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">No courses in the faculty database</p>
                <button
                  onClick={onOpenCreateCourse}
                  className="w-full py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition shadow-xs"
                >
                  + Create Your First Course
                </button>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
                {subjects.map((subj) => (
                  <button
                    key={subj.id}
                    onClick={() => onSelectSubject(subj)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition ${
                      selectedSubject?.id === subj.id
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{subj.code} — {subj.name}</span>
                    <span className="text-[10px] text-slate-400 ml-2 font-mono">Sem {subj.semester}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Institutional Role Indicator Badge */}
        <div className="hidden md:flex items-center">
          {getRoleBadge(currentUser?.role)}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          className="p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition shadow-xs"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Faculty Assistant Drawer Toggle */}
        <button
          onClick={onToggleCopilot}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border shadow-xs ${
            isCopilotOpen
              ? 'bg-blue-700 text-white border-blue-700'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
          title="Toggle Teaching Assistant Drawer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline">Assistant</span>
        </button>

        {/* User Profile Button & Sign Out */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <button
            onClick={onOpenProfileModal}
            title="Click to View & Edit Profile"
            className="flex items-center space-x-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-700 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="hidden xl:block">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[120px] group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {currentUser?.full_name || 'Professor'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                {currentUser?.designation || currentUser?.department || 'Edit Profile'}
              </p>
            </div>
          </button>

          <button
            onClick={onLogout}
            title="Log Out & Return to Login"
            className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
