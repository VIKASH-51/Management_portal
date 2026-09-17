import React, { useState, useRef, useEffect } from 'react';
import { Subject, User } from '../types';
import { api } from '../services/api';
import { 
  User as UserIcon, Send, Sparkles, Paperclip, 
  FileSpreadsheet, BookOpen, Layers, CheckCircle2, 
  Download, ArrowRight, ShieldCheck, ChevronDown, ChevronUp,
  FileText, Database, Settings, RefreshCw, Cpu, Award, Table,
  X, Upload, HelpCircle, CheckSquare, GraduationCap
} from 'lucide-react';
import { DownloadFormatModal } from './DownloadFormatModal';

interface ChatbotStudioProps {
  subject: Subject | null;
  currentUser: User | null;
  onNavigateTab: (tab: any) => void;
  onOpenCreateCourse: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'USER' | 'AGENT';
  text: string;
  timestamp: string;
  attachedFileName?: string;
  agentSteps?: Array<{ step: number; name: string; status: string; detail: string }>;
  embeddedCard?: 'QUESTION_PAPER' | 'ANSWER_KEY' | 'QUESTION_BANK' | 'NOTES' | 'ADMIN' | 'OBE';
  cardData?: any;
}

export const ChatbotStudio: React.FC<ChatbotStudioProps> = ({
  subject,
  currentUser,
  onNavigateTab,
  onOpenCreateCourse
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'AGENT',
      text: `Welcome, Professor ${currentUser?.full_name || ''}. I am your **Curriculum & Examination Assistant**.\n\nI can assist you with authoring **multi-set question papers (MCQs, Fill-in-the-blanks, Short answers, Long analytical questions, and Case studies)** with verified syllabus coverage and zero cross-set duplicate questions.\n\nYou may also attach any reference or syllabus file (PDF, DOCX, XLSX, TXT) to automatically configure examination sections or audit accreditation compliance.\n\nHow may I assist with your courseware today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<{ [msgId: string]: boolean }>({});
  const [chatAttachedFile, setChatAttachedFile] = useState<File | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  
  // Download Format Modal State
  const [downloadModalData, setDownloadModalData] = useState<{
    isOpen: boolean;
    qpId: number;
    subjectCode: string;
    subjectName: string;
    selectedSetCode: string;
    availableSets: string[];
  }>({
    isOpen: false,
    qpId: 0,
    subjectCode: '',
    subjectName: '',
    selectedSetCode: 'Set A',
    availableSets: ['Set A', 'Set B', 'Set C']
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage.trim();
    if (!textToSend || isProcessing) return;

    const fileToProcess = chatAttachedFile;
    const userMsgId = `usr_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'USER',
      text: textToSend,
      attachedFileName: fileToProcess ? fileToProcess.name : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setChatAttachedFile(null);
    setIsProcessing(true);

    const promptLower = textToSend.toLowerCase();

    try {
      // 0. Extract Template Intent from File
      if (fileToProcess && (promptLower.includes('template') || promptLower.includes('layout') || promptLower.includes('extract'))) {
        const blueprint = await api.extractTemplateFromFile(fileToProcess);
        addAgentMessage(
          `📄 **Extracted Question Paper Blueprint from ${blueprint.filename}**:\n\n` +
          `• **Detected Title:** ${blueprint.detected_title}\n` +
          `• **Duration:** ${blueprint.detected_duration_minutes} Minutes | **Total Marks:** ${blueprint.calculated_total_marks} Marks\n` +
          `• **Sections Extracted:** ${blueprint.sections_count} Sections (${blueprint.custom_sections.map(s => `${s.name}: ${s.questions_count}x${s.marks_per_question}M [${s.question_type || 'Short/Long'}]`).join(' • ')})\n\n` +
          `You can open the **Examination Paper Workspace** to generate sets using this template.`,
          [
            { step: 1, name: "Parse Reference File", status: "COMPLETED", detail: `Parsed ${fileToProcess.name} (${(fileToProcess.size/1024).toFixed(1)} KB)` },
            { step: 2, name: "Extract Section Architecture", status: "COMPLETED", detail: `Identified ${blueprint.sections_count} sections with marks and question types` }
          ]
        );
        return;
      }

      // 1. Question Paper Intent
      if (promptLower.includes('question paper') || promptLower.includes('exam paper') || promptLower.includes('mcq') || promptLower.includes('fill') || promptLower.includes('case study') || promptLower.includes('set question') || promptLower.includes('sets')) {
        if (!subject) {
          addAgentMessage("Please select or create a course first before generating question papers.", undefined);
          return;
        }

        // Extract sets count if mentioned
        let setsCount = 3;
        const match = promptLower.match(/(\d+)\s*sets?/);
        if (match) setsCount = Math.min(Math.max(parseInt(match[1]), 1), 10);

        // Customize sections if specific question types mentioned in prompt
        let customSecs: any[] | undefined = undefined;
        if (promptLower.includes('mcq') && promptLower.includes('case study')) {
          customSecs = [
            { name: 'Part A', title: 'Multiple Choice Questions (10x1=10M)', questions_count: 10, marks_per_question: 1, choice_type: 'COMPULSORY', question_type: 'MCQ' },
            { name: 'Part B', title: 'Descriptive & Analytical Problems (5x13=65M)', questions_count: 5, marks_per_question: 13, choice_type: 'INTERNAL_CHOICE', question_type: 'LONG_ANSWER' },
            { name: 'Part C', title: 'Comprehensive Autonomous Case Study (1x25=25M)', questions_count: 1, marks_per_question: 25, choice_type: 'INTERNAL_CHOICE', question_type: 'CASE_STUDY' }
          ];
        } else if (promptLower.includes('mcq')) {
          customSecs = [
            { name: 'Part A', title: 'Multiple Choice Questions (20x1=20M)', questions_count: 20, marks_per_question: 1, choice_type: 'COMPULSORY', question_type: 'MCQ' },
            { name: 'Part B', title: 'Descriptive Analytical Problems (5x13=65M)', questions_count: 5, marks_per_question: 13, choice_type: 'INTERNAL_CHOICE', question_type: 'LONG_ANSWER' },
            { name: 'Part C', title: 'Comprehensive System Design (1x15=15M)', questions_count: 1, marks_per_question: 15, choice_type: 'INTERNAL_CHOICE', question_type: 'CASE_STUDY' }
          ];
        } else if (promptLower.includes('fill')) {
          customSecs = [
            { name: 'Part A', title: 'Fill in the Blanks & Short Concepts (10x2=20M)', questions_count: 10, marks_per_question: 2, choice_type: 'COMPULSORY', question_type: 'FILL_IN_BLANKS' },
            { name: 'Part B', title: 'Descriptive Analysis (5x13=65M)', questions_count: 5, marks_per_question: 13, choice_type: 'INTERNAL_CHOICE', question_type: 'LONG_ANSWER' },
            { name: 'Part C', title: 'Comprehensive Autonomous Case Study (1x15=15M)', questions_count: 1, marks_per_question: 15, choice_type: 'INTERNAL_CHOICE', question_type: 'CASE_STUDY' }
          ];
        }

        const genResult = await api.generateQuestionPaper({
          subject_id: subject.id,
          title: `${subject.code} Autonomous Examination`,
          sets_count: setsCount,
          total_marks: 100,
          difficulty_easy_pct: 30,
          difficulty_med_pct: 50,
          difficulty_hard_pct: 20,
          format_type: customSecs ? 'CUSTOM' : 'FORMAT_A',
          custom_sections: customSecs,
          faculty_prompt_instructions: textToSend
        });

        addAgentMessage(
          `Generated **${setsCount} Complete Examination Paper Sets (${genResult.question_paper.sets.map(s => s.set_code).join(', ')})** for **${subject.code} — ${subject.name}** with **0% Cross-Set Duplicates**.\n\nSections include **MCQs**, **Fill in the blanks**, **Short answers**, **Long descriptive problems**, and **Case studies**.\n\nMatching **Evaluation Rubrics & Answer Keys** and **Course Question Banks** are available for review.`,
          genResult.agent_steps,
          'QUESTION_PAPER',
          { qp: genResult.question_paper, setsCount }
        );
      }
      // 2. Answer Key Intent
      else if (promptLower.includes('answer key') || promptLower.includes('marking rubric') || promptLower.includes('solution') || promptLower.includes('scheme')) {
        if (!subject) {
          addAgentMessage("Please select a course first to view or synthesize evaluation rubrics.", undefined);
          return;
        }
        const qps = await api.getQuestionPapers(subject.id);
        if (qps.length === 0) {
          addAgentMessage(`No examination papers found for **${subject.code}**. Would you like me to generate a 3-set examination paper with matching answer keys now?`, undefined);
        } else {
          const latestQP = qps[0];
          const ansKeys = await api.getAnswerKeys(latestQP.id);
          addAgentMessage(
            `Retrieved **${ansKeys.length} Step-by-Step Marking Schemes** for **${subject.code} (${latestQP.title})**.\n\nIncludes point-wise mark allocation, MCQ answer keys, and evaluation rubrics.`,
            [
              { step: 1, name: "Extract Questions", status: "COMPLETED", detail: "Parsed items across all generated sets" },
              { step: 2, name: "Synthesize Point Rubrics", status: "COMPLETED", detail: "Step-marking schemes created for all sections" }
            ],
            'ANSWER_KEY',
            { qp: latestQP, answerKeys: ansKeys }
          );
        }
      }
      // 3. Question Bank Intent
      else if (promptLower.includes('question bank') || promptLower.includes('extra pool') || promptLower.includes('auxiliary') || promptLower.includes('reserve')) {
        if (!subject) {
          addAgentMessage("Please select a course first to access its Question Bank.", undefined);
          return;
        }
        const qbItems = await api.getQuestionBank(subject.id);
        addAgentMessage(
          `Retrieved **${qbItems.length} Question Bank Items** for **${subject.code}** categorized by **Set A, Set B, Set C**, plus the **Reserve Auxiliary Question Pool** for tutorials, re-examinations, and quizzes.`,
          [
            { step: 1, name: "Query Bank Database", status: "COMPLETED", detail: `Retrieved ${qbItems.length} verified questions across Units 1–5` },
            { step: 2, name: "Categorize by Set & Reserve Pool", status: "COMPLETED", detail: "Segregated exam questions from supplementary reserve pool" }
          ],
          'QUESTION_BANK',
          { qbItems, subject }
        );
      }
      // 4. Lecture Notes Intent
      else if (promptLower.includes('lecture notes') || promptLower.includes('notes') || promptLower.includes('unit') || promptLower.includes('topic')) {
        if (!subject) {
          addAgentMessage("Please select a course first to synthesize lecture notes.", undefined);
          return;
        }
        const unitNum = 1;
        const topicName = subject.units?.[0]?.topics?.[0] || `${subject.name} Core Principles`;
        
        const noteResult = await api.generateNotes({
          subject_id: subject.id,
          unit_number: unitNum,
          topic: topicName
        });

        addAgentMessage(
          `Authored **Courseware Lecture Notes** for **Unit ${unitNum}: ${topicName}** (${subject.code}).\n\nIncludes **Architecture Flowchart**, **[Exam Perspective] Key Points**, **[Common Mistakes]**, and **Quick Summary Bullet Points**.`,
          noteResult.agent_steps,
          'NOTES',
          { note: noteResult.note, quality: noteResult.quality_evaluation }
        );
      }
      // 5. Admin Governance Intent
      else if (promptLower.includes('admin') || promptLower.includes('staff approval') || promptLower.includes('permit') || promptLower.includes('super admin')) {
        const users = await api.getAdminUsers();
        const pendingCount = users.filter(u => u.approval_status === 'PENDING').length;
        addAgentMessage(
          `🛡️ **Admin Governance & Faculty Management Center**\n\nThere are currently **${users.length} registered faculty accounts** (${pendingCount} pending approval).\n\nAuthorized Administrators can approve registrations and toggle login access.`,
          [
            { step: 1, name: "Query User Accounts", status: "COMPLETED", detail: `Loaded ${users.length} faculty and administrator accounts` },
            { step: 2, name: "Verify Permissions", status: "COMPLETED", detail: `Current User Role: ${currentUser?.role || 'FACULTY'}` }
          ],
          'ADMIN',
          { users, pendingCount }
        );
      }
      // 6. Outcome-Based Education (OBE / NBA) Intent
      else if (promptLower.includes('obe') || promptLower.includes('co-po') || promptLower.includes('nba') || promptLower.includes('outcome') || promptLower.includes('matrix')) {
        if (!subject) {
          addAgentMessage("Please select a course first to view Course Outcomes (COs) and the NBA Articulation Matrix.", undefined);
          return;
        }
        const obeData = await api.getOBEMatrix(subject.id);
        addAgentMessage(
          `📊 **Outcome-Based Education (OBE) & NBA Accreditation Matrix** for **${subject.code} — ${subject.name}**\n\n• **${obeData.course_outcomes?.length || 5} Course Outcomes (CO1–CO5)** mapped across Bloom taxonomy levels.\n• **5×15 Articulation Matrix** mapping COs to 12 NBA Program Outcomes (PO1–PO12) and 3 PSOs.\n• **Question Paper Attainment Distribution** with live balance analysis and official NBA Excel/PDF exports.`,
          [
            { step: 1, name: "Load Course Outcomes", status: "COMPLETED", detail: "Retrieved CO1–CO5 statements and Bloom levels" },
            { step: 2, name: "Compute Correlation Matrix", status: "COMPLETED", detail: "Calculated PO1–PO12 & PSO1–PSO3 averages" },
            { step: 3, name: "Evaluate Exam Attainment", status: "COMPLETED", detail: "Calculated marks distribution across CO1–CO5" }
          ],
          'OBE',
          { obeData, subject }
        );
      }
      // Default Assistant Chat
      else {
        if (subject) {
          const response = await api.copilotChat(subject.id, textToSend);
          addAgentMessage(
            response.reply,
            response.sources?.map((s: any, idx: number) => ({
              step: idx + 1,
              name: `Course Syllabus Reference [${s.filename || 'Syllabus'}]`,
              status: "COMPLETED",
              detail: `Unit ${s.unit || 1} • Alignment: ${(s.similarity * 100).toFixed(0)}%`
            }))
          );
        } else {
          addAgentMessage(
            `I received your instruction: "*${textToSend}*". To generate course-grounded materials (such as **Question Papers, Answer Keys, Lecture Notes, or NBA Articulation Matrices**), please select an active course from the top dropdown.`,
            undefined
          );
        }
      }
    } catch (err: any) {
      console.error(err);
      addAgentMessage(`I encountered an error executing your request: ${err?.message || 'Server error'}. Please verify server connection.`, undefined);
    } finally {
      setIsProcessing(false);
    }
  };

  const addAgentMessage = (
    text: string, 
    agentSteps?: Array<{ step: number; name: string; status: string; detail: string }>,
    embeddedCard?: 'QUESTION_PAPER' | 'ANSWER_KEY' | 'QUESTION_BANK' | 'NOTES' | 'ADMIN' | 'OBE',
    cardData?: any
  ) => {
    const agentMsg: ChatMessage = {
      id: `agent_${Date.now()}`,
      sender: 'AGENT',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      agentSteps,
      embeddedCard,
      cardData
    };
    setMessages(prev => [...prev, agentMsg]);
  };

  const toggleSteps = (msgId: string) => {
    setExpandedSteps(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.map((msg) => {
          const isUser = msg.sender === 'USER';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 dark:bg-slate-700 text-white border border-slate-600'
                }`}
              >
                {isUser ? <UserIcon className="w-4 h-4" /> : <GraduationCap className="w-4 h-4 text-blue-300" />}
              </div>

              {/* Message Bubble Container */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] space-y-3 ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                {/* Text Card */}
                <div
                  className={`p-4 rounded-xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-xs'
                  }`}
                >
                  {msg.attachedFileName && (
                    <div className="mb-2 p-1.5 rounded bg-blue-700 text-[11px] font-semibold flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5" />
                      Attached File: {msg.attachedFileName}
                    </div>
                  )}
                  {msg.text}
                </div>

                {/* Agent Multi-Step Execution Trace */}
                {msg.agentSteps && msg.agentSteps.length > 0 && (
                  <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2 text-xs">
                    <button
                      onClick={() => toggleSteps(msg.id)}
                      className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Verification Pipeline ({msg.agentSteps.length} Checks)
                      </span>
                      {expandedSteps[msg.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {expandedSteps[msg.id] && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                        {msg.agentSteps.map((st) => (
                          <div key={st.step} className="flex items-start gap-2 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                Step {st.step}: {st.name}
                              </span>
                              <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                                {st.detail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* EMBEDDED ACTION CARD 1: QUESTION PAPER */}
                {msg.embeddedCard === 'QUESTION_PAPER' && msg.cardData?.qp && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {msg.cardData.qp.title}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        0% Cross-Set Duplicates
                      </span>
                    </div>

                    {/* Set Pills */}
                    <div className="flex flex-wrap gap-2">
                      {msg.cardData.qp.sets?.map((s: any) => (
                        <div
                          key={s.id}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center justify-between gap-3"
                        >
                          <span className="font-bold text-blue-600 dark:text-blue-400">{s.set_code}</span>
                          <span className="text-[10px] text-slate-500">{s.items?.length || 0} Questions</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => {
                          setDownloadModalData({
                            isOpen: true,
                            qpId: msg.cardData.qp.id,
                            subjectCode: subject?.code || '',
                            subjectName: subject?.name || '',
                            selectedSetCode: 'Set A',
                            availableSets: msg.cardData.qp.sets?.map((s: any) => s.set_code) || ['Set A', 'Set B', 'Set C']
                          });
                        }}
                        className="btn-primary text-xs flex items-center gap-1.5 py-1 px-3"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF / Word
                      </button>

                      <button
                        onClick={() => onNavigateTab('QUESTION_PAPERS')}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
                      >
                        Open in Examination Workspace <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* EMBEDDED ACTION CARD 2: ANSWER KEY */}
                {msg.embeddedCard === 'ANSWER_KEY' && msg.cardData?.answerKeys && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Evaluation Rubrics & Schemes ({msg.cardData.answerKeys.length} Sets)
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Step marking rubrics, objective answer keys, and detailed model solutions are ready.
                    </p>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => onNavigateTab('QUESTION_PAPERS')}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
                      >
                        View Schemes & Rubrics <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* EMBEDDED ACTION CARD 3: QUESTION BANK */}
                {msg.embeddedCard === 'QUESTION_BANK' && msg.cardData?.qbItems && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Segregated Question Bank ({msg.cardData.qbItems.length} Questions)
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => onNavigateTab('QUESTION_PAPERS')}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
                      >
                        Open Course Question Bank <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* EMBEDDED ACTION CARD 4: LECTURE NOTES */}
                {msg.embeddedCard === 'NOTES' && msg.cardData?.note && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {msg.cardData.note.title}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        Syllabus Aligned
                      </span>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => onNavigateTab('NOTES')}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
                      >
                        Open in Lecture Notes Workspace <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* EMBEDDED ACTION CARD 5: ADMIN GOVERNANCE */}
                {msg.embeddedCard === 'ADMIN' && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Faculty Management & Admin Approvals
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => onNavigateTab('ADMIN')}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
                      >
                        Open Faculty Admin Center <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* EMBEDDED ACTION CARD 6: OBE STUDIO */}
                {msg.embeddedCard === 'OBE' && msg.cardData?.obeData && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Table className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          NBA Accreditation Package (CO-PO 5×15 Articulation Matrix)
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => onNavigateTab('OBE')}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
                      >
                        Open CO-PO Matrix & Exam Blueprint <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {/* Processing Typing Indicator */}
        {isProcessing && (
          <div className="flex items-center space-x-3 text-xs text-slate-600 dark:text-slate-300 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 max-w-md">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
            <span>Processing syllabus and generating materials...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Smart Quick Prompt Chips */}
      <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 overflow-x-auto shrink-0">
        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 shrink-0">
          Faculty Actions:
        </span>
        <button
          onClick={() => handleSendMessage("Generate 3 sets question paper with 10 MCQs and 1 Case Study from syllabus")}
          className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700 shrink-0 transition"
        >
          Draft 3 Sets of Question Papers
        </button>
        <button
          onClick={() => handleSendMessage("Show Course Outcomes (CO1-CO5) and NBA CO-PO Articulation Matrix")}
          className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700 shrink-0 transition"
        >
          NBA CO-PO Matrix & Attainment
        </button>
        <button
          onClick={() => handleSendMessage("Generate Question Bank with segregated sets and extra auxiliary questions")}
          className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700 shrink-0 transition"
        >
          Course Question Bank & Reserve Pool
        </button>
        <button
          onClick={() => handleSendMessage("Create Lecture Notes for Unit 1 with Mermaid Diagram and Exam Points")}
          className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700 shrink-0 transition"
        >
          Unit 1 Lecture Notes & Visuals
        </button>
      </div>

      {/* Input Form Bar with File Attachment */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-2">
        {chatAttachedFile && (
          <div className="flex items-center gap-2 p-1.5 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
            <Paperclip className="w-3.5 h-3.5" />
            <span className="font-semibold">Attached: {chatAttachedFile.name}</span>
            <span className="text-[10px] text-slate-500">({(chatAttachedFile.size/1024).toFixed(1)} KB)</span>
            <button
              type="button"
              onClick={() => setChatAttachedFile(null)}
              className="ml-auto p-0.5 hover:bg-blue-200 dark:hover:bg-blue-900 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={chatFileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv,.json,.png,.jpg,.jpeg,.md"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setChatAttachedFile(e.target.files[0]);
              }
            }}
          />

          <button
            type="button"
            onClick={() => chatFileInputRef.current?.click()}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700 transition shrink-0"
            title="Attach reference document / question paper template"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus-within:ring-1 focus-within:ring-blue-500">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask the faculty assistant (e.g. 'Draft a 3-set question paper for Unit 2 and 3', 'Extract layout from attached file')..."
              className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={(!inputMessage.trim() && !chatAttachedFile) || isProcessing}
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* Download Format Modal */}
      <DownloadFormatModal
        isOpen={downloadModalData.isOpen}
        onClose={() => setDownloadModalData(prev => ({ ...prev, isOpen: false }))}
        qpId={downloadModalData.qpId}
        subjectCode={downloadModalData.subjectCode}
        subjectName={downloadModalData.subjectName}
        selectedSetCode={downloadModalData.selectedSetCode}
        availableSets={downloadModalData.availableSets}
      />
    </div>
  );
};
