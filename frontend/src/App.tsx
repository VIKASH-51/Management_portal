import React, { useState, useEffect } from 'react';
import { User, Subject, Role } from './types';
import { api, clearAuthToken } from './services/api';
import { ThemeProvider } from './context/ThemeContext';
import { LayoutDashboard } from 'lucide-react';
import { LoginPage } from './components/LoginPage';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { ChatbotStudio } from './components/ChatbotStudio';
import { SubjectOverview } from './components/SubjectOverview';
import { OBEStudio } from './components/OBEStudio';
import { DocumentsVault } from './components/DocumentsVault';
import { LectureNotesStudio } from './components/LectureNotesStudio';
import { QuestionPaperStudio } from './components/QuestionPaperStudio';
import { AnswerKeyStudio } from './components/AnswerKeyStudio';
import { QuestionBankManager } from './components/QuestionBankManager';
import { TrendAnalyzer } from './components/TrendAnalyzer';
import { ResearchHub } from './components/ResearchHub';
import { VisionStudio } from './components/VisionStudio';
import { LearningMemoryCenter } from './components/LearningMemoryCenter';
import { AdminPortal } from './components/AdminPortal';
import { CopilotDrawer } from './components/CopilotDrawer';
import { CreateSubjectModal } from './components/CreateSubjectModal';
import { EditSubjectModal } from './components/EditSubjectModal';
import { EditProfileModal } from './components/EditProfileModal';
import { EmptyWorkspace } from './components/EmptyWorkspace';

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Auto-restore session from stored JWT on mount
  useEffect(() => {
    const token = localStorage.getItem('academic_token');
    if (token) {
      api.getMe().then(user => {
        setCurrentUser(user);
        setIsAuthenticated(true);
        fetchSubjects();
      }).catch(() => {
        clearAuthToken();
        setCurrentUser(null);
        setIsAuthenticated(false);
      });
    } else {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  }, []);

  // Fetch subjects for authenticated user
  const fetchSubjects = async (selectLatestId?: number) => {
    try {
      setLoading(true);
      const subjs = await api.getSubjects();
      setSubjects(subjs);
      if (selectLatestId) {
        const found = subjs.find(s => s.id === selectLatestId);
        if (found) setSelectedSubject(found);
      } else if (subjs.length > 0 && !selectedSubject) {
        setSelectedSubject(subjs[0]);
      } else if (subjs.length === 0) {
        setSelectedSubject(null);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    await fetchSubjects();
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setSubjects([]);
    setSelectedSubject(null);
    setActiveTab('OVERVIEW');
  };

  const handleSubjectCreated = (newSubj: Subject) => {
    setSubjects(prev => [newSubj, ...prev]);
    setSelectedSubject(newSubj);
  };

  const handleSubjectUpdated = (updatedSubj: Subject) => {
    setSubjects(prev => prev.map(s => s.id === updatedSubj.id ? updatedSubj : s));
    setSelectedSubject(updatedSubj);
  };

  // If not authenticated, render Login Page
  if (!isAuthenticated || !currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation Bar */}
      <Header
        currentUser={currentUser}
        subjects={subjects}
        selectedSubject={selectedSubject}
        onSelectSubject={(subj) => setSelectedSubject(subj)}
        onToggleCopilot={() => setIsCopilotOpen(!isCopilotOpen)}
        isCopilotOpen={isCopilotOpen}
        onOpenCreateCourse={() => setIsCreateModalOpen(true)}
        onOpenEditCourse={() => setIsEditModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex max-w-[1720px] w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          currentUser={currentUser}
        />

        {/* Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-full">
          {/* AI Chatbot Studio (Primary Hub) */}
          {activeTab === 'CHATBOT' && (
            <ChatbotStudio
              subject={selectedSubject}
              currentUser={currentUser}
              onNavigateTab={setActiveTab}
              onOpenCreateCourse={() => setIsCreateModalOpen(true)}
            />
          )}

          {/* Admin Portal */}
          {activeTab === 'ADMIN' && (
            <AdminPortal currentUser={currentUser} />
          )}

          {/* Autonomous Learning & Memory */}
          {activeTab === 'LEARNING' && (
            <LearningMemoryCenter subject={selectedSubject} />
          )}

          {/* Vision OCR Studio */}
          {activeTab === 'VISION' && (
            <VisionStudio subject={selectedSubject} />
          )}

          {/* References & Literature Hub */}
          {activeTab === 'RESEARCH' && (
            <ResearchHub
              subject={selectedSubject}
              onOpenCreateCourse={() => setIsCreateModalOpen(true)}
            />
          )}

          {/* Overview Tab when no subject exists */}
          {activeTab === 'OVERVIEW' && !selectedSubject && (
            <EmptyWorkspace
              onCreateCourse={() => setIsCreateModalOpen(true)}
              onNavigateTab={setActiveTab}
            />
          )}

          {/* Overview Tab when subject exists */}
          {activeTab === 'OVERVIEW' && selectedSubject && (
            <SubjectOverview
              subject={selectedSubject}
              onNavigate={setActiveTab}
              onEditSubject={() => setIsEditModalOpen(true)}
            />
          )}

          {/* Subject-specific Tabs when subject exists */}
          {selectedSubject && (
            <>
              {activeTab === 'OBE' && (
                <OBEStudio subject={selectedSubject} />
              )}

              {activeTab === 'NOTES' && (
                <LectureNotesStudio subject={selectedSubject} />
              )}

              {activeTab === 'QUESTION_PAPERS' && (
                <QuestionPaperStudio subject={selectedSubject} />
              )}

              {activeTab === 'ANSWER_KEYS' && (
                <AnswerKeyStudio subject={selectedSubject} />
              )}

              {activeTab === 'QUESTION_BANK' && (
                <QuestionBankManager subject={selectedSubject} />
              )}

              {activeTab === 'DOCUMENTS' && (
                <DocumentsVault subject={selectedSubject} />
              )}

              {activeTab === 'TRENDS' && (
                <TrendAnalyzer subject={selectedSubject} />
              )}
            </>
          )}

          {/* Prompt banner when clicking subject-dependent studios before a course is created */}
          {!selectedSubject && activeTab !== 'CHATBOT' && activeTab !== 'ADMIN' && activeTab !== 'LEARNING' && activeTab !== 'VISION' && activeTab !== 'RESEARCH' && activeTab !== 'OVERVIEW' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-xl mx-auto shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Course Workspace Required
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    You have navigated to{' '}
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {activeTab === 'QUESTION_PAPERS' && 'Exam Paper Creator'}
                      {activeTab === 'NOTES' && 'Lecture Notes & Handouts'}
                      {activeTab === 'ANSWER_KEYS' && 'Marking Schemes & Rubrics'}
                      {activeTab === 'QUESTION_BANK' && 'Course Question Bank'}
                      {activeTab === 'OBE' && 'OBE & NBA Matrix'}
                      {activeTab === 'DOCUMENTS' && 'Syllabus & Course Vault'}
                      {activeTab === 'TRENDS' && '5-Yr Exam Trend Analyzer'}
                    </span>
                    . To generate syllabus-aligned autonomous content, please initialize your first course workspace.
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>+ Create Course Workspace</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('OVERVIEW')}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Back to Overview
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Subject Copilot AI Drawer */}
      <CopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        subject={selectedSubject}
        onNavigateTab={setActiveTab}
      />

      {/* Create Subject Modal */}
      <CreateSubjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubjectCreated={handleSubjectCreated}
      />

      {/* Edit/Customize Subject Modal */}
      <EditSubjectModal
        isOpen={isEditModalOpen}
        subject={selectedSubject}
        onClose={() => setIsEditModalOpen(false)}
        onSubjectUpdated={handleSubjectUpdated}
      />

      {/* Edit Profile Modal */}
      {currentUser && (
        <EditProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onProfileUpdated={(updatedUser) => {
            setCurrentUser(updatedUser);
          }}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
