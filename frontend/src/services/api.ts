import { 
  User, Subject, DocumentItem, Note, NoteVersion, 
  QuestionPaper, AnswerKey, QuestionBankItem, TrendAnalysis,
  BookRecommendation, YouTubeTutorial,
  CourseOutcome, TemplateBlueprint, VerificationReport,
  SystemHealth, AuditLogItem, AIUsageSummary, OBEMatrixData
} from '../types';

export const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '3000')
    ? `http://${window.location.hostname || 'localhost'}:8000/api` 
    : '/api');

let currentToken = localStorage.getItem('academic_token') || '';

export const setAuthToken = (token: string) => {
  currentToken = token;
  localStorage.setItem('academic_token', token);
};

export const clearAuthToken = () => {
  currentToken = '';
  localStorage.removeItem('academic_token');
  localStorage.removeItem('academic_user');
};

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
});

export const api = {
  // Auth & Roles
  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async updateProfile(data: { full_name?: string; department?: string; institution?: string; designation?: string; password?: string }): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to update profile');
    }
    return res.json();
  },

  async switchRole(role: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/auth/switch-role/${role}`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to switch role');
    const data = await res.json();
    setAuthToken(data.access_token);
    return data;
  },

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    const res = await fetch(`${API_BASE_URL}/subjects`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch subjects');
    return res.json();
  },

  async getSubject(id: number): Promise<Subject> {
    const res = await fetch(`${API_BASE_URL}/subjects/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch subject');
    return res.json();
  },

  async createSubject(data: Partial<Subject>): Promise<Subject> {
    const res = await fetch(`${API_BASE_URL}/subjects`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create subject');
    return res.json();
  },

  async updateSubject(id: number, data: Partial<Subject>): Promise<Subject> {
    const res = await fetch(`${API_BASE_URL}/subjects/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update subject');
    return res.json();
  },

  async deleteSubject(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/subjects/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete subject');
  },

  async generateSyllabusAI(data: { code: string; name: string; department?: string; regulation?: string }): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/subjects/ai-generate-syllabus`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to auto-generate syllabus');
    return res.json();
  },

  async extractSyllabusFromFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/subjects/extract-syllabus-from-file`, {
      method: 'POST',
      headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {},
      body: formData
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to extract syllabus from file');
    }
    return res.json();
  },

  async parseSyllabusText(rawText: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/subjects/parse-syllabus-text`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ raw_text: rawText })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to parse syllabus text');
    }
    return res.json();
  },

  // Documents
  async getSubjectDocuments(subjectId: number): Promise<DocumentItem[]> {
    const res = await fetch(`${API_BASE_URL}/documents/subject/${subjectId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async uploadDocument(subjectId: number, docType: string, file: File): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('subject_id', subjectId.toString());
    formData.append('document_type', docType);
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {},
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
  },

  async deleteDocument(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  // Lecture Notes
  async getNotes(subjectId: number): Promise<Note[]> {
    const res = await fetch(`${API_BASE_URL}/notes/subject/${subjectId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  },

  async getNote(id: number): Promise<Note> {
    const res = await fetch(`${API_BASE_URL}/notes/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch note');
    return res.json();
  },

  async generateNotes(payload: {
    subject_id: number;
    unit_number: number;
    topic: string;
    learning_objectives?: string[];
    tone?: string;
    include_diagram?: boolean;
    include_exam_points?: boolean;
    include_common_mistakes?: boolean;
    include_revision?: boolean;
    focus_keywords?: string[];
  }): Promise<{ note: Note; agent_steps: any[]; quality_evaluation: any }> {
    const res = await fetch(`${API_BASE_URL}/notes/generate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to generate notes');
    return res.json();
  },

  async updateNote(id: number, data: { content_markdown?: string; title?: string; status?: string }): Promise<Note> {
    const res = await fetch(`${API_BASE_URL}/notes/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update note');
    return res.json();
  },

  async approveNote(id: number): Promise<Note> {
    const res = await fetch(`${API_BASE_URL}/notes/${id}/approve`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to approve note');
    return res.json();
  },

  async getNoteVersions(id: number): Promise<NoteVersion[]> {
    const res = await fetch(`${API_BASE_URL}/notes/${id}/versions`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch note versions');
    return res.json();
  },

  // Question Papers
  async getQuestionPapers(subjectId: number): Promise<QuestionPaper[]> {
    const res = await fetch(`${API_BASE_URL}/question-papers/subject/${subjectId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch question papers');
    return res.json();
  },

  async getQuestionPaper(id: number): Promise<QuestionPaper> {
    const res = await fetch(`${API_BASE_URL}/question-papers/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch question paper');
    return res.json();
  },

  async generateQuestionPaper(payload: {
    subject_id: number;
    title?: string;
    exam_name?: string;
    duration_minutes?: number;
    sets_count: number;
    total_marks: number;
    difficulty_easy_pct: number;
    difficulty_med_pct: number;
    difficulty_hard_pct: number;
    format_type: string;
    units_included?: number[];
    custom_sections?: any[];
    faculty_prompt_instructions?: string;
    custom_pattern_text?: string;
    teacher_custom_questions?: any[];
    custom_questions_text?: string;
    template_context?: string;
  }): Promise<{ question_paper: QuestionPaper; uniqueness_report: any; agent_steps: any[] }> {
    const res = await fetch(`${API_BASE_URL}/question-papers/generate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to generate question paper');
    return res.json();
  },

  async extractTemplateFromFile(file: File): Promise<TemplateBlueprint> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/question-papers/extract-template`, {
      method: 'POST',
      headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {},
      body: formData
    });
    if (!res.ok) throw new Error('Failed to extract exam template blueprint from file');
    return res.json();
  },

  async verifyAgainstReference(params: {
    subject_id: number;
    question_paper_id?: number;
    file?: File;
    reference_text_input?: string;
  }): Promise<VerificationReport> {
    const formData = new FormData();
    formData.append('subject_id', params.subject_id.toString());
    if (params.question_paper_id) {
      formData.append('question_paper_id', params.question_paper_id.toString());
    }
    if (params.file) {
      formData.append('file', params.file);
    }
    if (params.reference_text_input) {
      formData.append('reference_text_input', params.reference_text_input);
    }

    const res = await fetch(`${API_BASE_URL}/question-papers/verify-against-reference`, {
      method: 'POST',
      headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {},
      body: formData
    });
    if (!res.ok) throw new Error('Failed to perform reference verification audit');
    return res.json();
  },

  // Answer Keys
  async getAnswerKeys(qpId: number): Promise<AnswerKey[]> {
    const res = await fetch(`${API_BASE_URL}/answer-keys/question-paper/${qpId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch answer keys');
    return res.json();
  },

  async getQuestionBank(subjectId: number, params?: { unit?: number; difficulty?: string; bloom?: string; search?: string; set_origin?: string; is_extra_pool?: boolean }): Promise<QuestionBankItem[]> {
    const query = new URLSearchParams();
    if (params?.unit) query.append('unit', params.unit.toString());
    if (params?.difficulty) query.append('difficulty', params.difficulty);
    if (params?.bloom) query.append('bloom', params.bloom);
    if (params?.search) query.append('search', params.search);
    if (params?.set_origin) query.append('set_origin', params.set_origin);
    if (params?.is_extra_pool !== undefined) query.append('is_extra_pool', params.is_extra_pool.toString());

    const res = await fetch(`${API_BASE_URL}/question-bank/subject/${subjectId}?${query.toString()}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch question bank');
    return res.json();
  },

  async addQuestionBankItem(data: Partial<QuestionBankItem>): Promise<QuestionBankItem> {
    const res = await fetch(`${API_BASE_URL}/question-bank`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add question to bank');
    return res.json();
  },

  async deleteQuestionBankItem(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/question-bank/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete question bank item');
  },

  // Trends
  async getTrends(subjectId: number): Promise<TrendAnalysis> {
    const res = await fetch(`${API_BASE_URL}/trends/subject/${subjectId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch trends');
    return res.json();
  },

  // Research, Books & YouTube
  async searchReferences(query: string): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/research/references?query=${encodeURIComponent(query)}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to search references');
    return res.json();
  },

  async getBooks(subjectId: number): Promise<BookRecommendation[]> {
    const res = await fetch(`${API_BASE_URL}/research/books/${subjectId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch books');
    return res.json();
  },

  async getYouTube(subjectId: number): Promise<YouTubeTutorial[]> {
    const res = await fetch(`${API_BASE_URL}/research/youtube/${subjectId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch YouTube tutorials');
    return res.json();
  },

  // Vision & Image OCR
  async processImage(subjectId: number, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('subject_id', subjectId.toString());
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/vision/process-image`, {
      method: 'POST',
      headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {},
      body: formData
    });
    if (!res.ok) throw new Error('Failed to process image');
    return res.json();
  },

  async getProcessedImages(subjectId: number): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/vision/history/${subjectId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch vision history');
    return res.json();
  },

  // Autonomous Learning & Memory
  async getAgentMemories(agentName?: string): Promise<any[]> {
    const query = agentName ? `?agent_name=${encodeURIComponent(agentName)}` : '';
    const res = await fetch(`${API_BASE_URL}/learning/memories${query}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch agent memories');
    return res.json();
  },

  async triggerWebLearning(query: string, agentName: string = 'AcademicAgent'): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/learning/learn-from-web`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ query, agent_name: agentName })
    });
    if (!res.ok) throw new Error('Failed to trigger web learning');
    return res.json();
  },

  // Copilot Chat
  async chatCopilot(subjectId: number | undefined, message: string): Promise<{ response: string; agent_steps: string[]; suggested_actions: any[] }> {
    const res = await fetch(`${API_BASE_URL}/copilot/chat`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ subject_id: subjectId, message })
    });
    if (!res.ok) throw new Error('Failed to send copilot message');
    return res.json();
  },

  // Admin & Super Admin
  async getSystemHealth(): Promise<SystemHealth> {
    const res = await fetch(`${API_BASE_URL}/admin/health`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  },

  async getAllUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE_URL}/admin/users`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async getAdminUsers(): Promise<User[]> {
    return this.getAllUsers();
  },

  async copilotChat(subjectId: number | undefined, message: string): Promise<{ reply: string; sources?: any[] }> {
    const res = await fetch(`${API_BASE_URL}/copilot/chat`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ subject_id: subjectId, message })
    });
    if (!res.ok) throw new Error('Failed to send copilot message');
    const data = await res.json();
    return { reply: data.response || data.reply, sources: data.sources || [] };
  },

  async toggleUserStatus(userId: number): Promise<{ status: string; is_active: boolean }> {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/toggle-status`, {
      method: 'PATCH',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to toggle user status');
    return res.json();
  },

  async handleStaffApproval(userId: number, status: 'APPROVED' | 'REJECTED'): Promise<{ status: string; approval_status: string; is_active: boolean }> {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/approval?status=${status}`, {
      method: 'PATCH',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to update staff approval');
    return res.json();
  },

  async deleteUser(userId: number): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete user');
    return res.json();
  },

  async generateExtraQuestions(subjectId: number, count: number = 15): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/question-bank/generate-extra-pool/${subjectId}?count=${count}`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to generate extra questions');
    return res.json();
  },

  async getAuditLogs(): Promise<AuditLogItem[]> {
    const res = await fetch(`${API_BASE_URL}/admin/audit-logs`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async getAIUsage(): Promise<AIUsageSummary> {
    const res = await fetch(`${API_BASE_URL}/admin/ai-usage`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch AI usage');
    return res.json();
  },

  async getAdminQuestionPapers(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/admin/question-papers`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch question papers for approval');
    return res.json();
  },

  async approveAdminQuestionPaper(qpId: number, status: 'VERIFIED' | 'APPROVED' | 'REJECTED', notes?: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/question-papers/${qpId}/approve`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ status, notes: notes || 'Approved by Dean / Examination Cell' })
    });
    if (!res.ok) throw new Error('Failed to approve question paper');
    return res.json();
  },

  // Client-Side File Downloader (handles auth headers, blobs, and automatic browser saving)
  async downloadFile(url: string, defaultFilename: string): Promise<void> {
    const token = currentToken || localStorage.getItem('academic_token') || '';
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
      let errMsg = `Download failed (${res.status} ${res.statusText})`;
      try {
        const errData = await res.json();
        if (errData.detail) errMsg = errData.detail;
      } catch {
        // ignore non-json
      }
      throw new Error(errMsg);
    }

    let filename = defaultFilename;
    const disposition = res.headers.get('content-disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '').trim();
      }
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },

  // Export URLs
  getExportQPPdfUrl(qpId: number, setCode: string = 'Set A'): string {
    return `${API_BASE_URL}/export/question-paper/${qpId}/pdf?set_code=${encodeURIComponent(setCode)}`;
  },

  getExportQPWordUrl(qpId: number, setCode: string = 'Set A'): string {
    return `${API_BASE_URL}/export/question-paper/${qpId}/docx?set_code=${encodeURIComponent(setCode)}`;
  },

  getExportQPLatexUrl(qpId: number, setCode: string = 'Set A'): string {
    return `${API_BASE_URL}/export/question-paper/${qpId}/latex?set_code=${encodeURIComponent(setCode)}`;
  },

  getExportQPMdUrl(qpId: number, setCode: string = 'Set A'): string {
    return `${API_BASE_URL}/export/question-paper/${qpId}/markdown?set_code=${encodeURIComponent(setCode)}`;
  },

  getExportQPTxtUrl(qpId: number, setCode: string = 'Set A'): string {
    return `${API_BASE_URL}/export/question-paper/${qpId}/text?set_code=${encodeURIComponent(setCode)}`;
  },

  getExportQPZipPackUrl(qpId: number): string {
    return `${API_BASE_URL}/export/question-paper/${qpId}/zip-pack`;
  },

  getExportNotesPdfUrl(noteId: number): string {
    return `${API_BASE_URL}/export/notes/${noteId}/pdf`;
  },

  getExportNotesDocxUrl(noteId: number): string {
    return `${API_BASE_URL}/export/notes/${noteId}/docx`;
  },

  getExportNotesMdUrl(noteId: number): string {
    return `${API_BASE_URL}/export/notes/${noteId}/markdown`;
  },

  getExportAnswerKeyPdfUrl(qpId: number, setCode: string = 'Set A'): string {
    return `${API_BASE_URL}/export/answer-key/${qpId}/pdf?set_code=${encodeURIComponent(setCode)}`;
  },

  getExportAnswerKeyWordUrl(qpId: number, setCode: string = 'Set A'): string {
    return `${API_BASE_URL}/export/answer-key/${qpId}/docx?set_code=${encodeURIComponent(setCode)}`;
  },

  getExportAnswerKeyTxtUrl(qpId: number, setCode: string = 'Set A'): string {
    return `${API_BASE_URL}/export/answer-key/${qpId}/text?set_code=${encodeURIComponent(setCode)}`;
  },

  getExportAnswerKeyMdUrl(qpId: number, setCode: string = 'Set A'): string {
    return `${API_BASE_URL}/export/answer-key/${qpId}/markdown?set_code=${encodeURIComponent(setCode)}`;
  },

  getExportAnswerKeyZipPackUrl(qpId: number): string {
    return `${API_BASE_URL}/export/answer-key/${qpId}/zip-pack`;
  },

  getExportQBExcelUrl(subjectId: number, unit?: number, setOrigin?: string, isExtraPool?: boolean): string {
    const params = new URLSearchParams();
    if (unit !== undefined && unit !== null) params.append('unit', unit.toString());
    if (setOrigin) params.append('set_origin', setOrigin);
    if (isExtraPool !== undefined && isExtraPool !== null) params.append('is_extra_pool', isExtraPool.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return `${API_BASE_URL}/export/question-bank/${subjectId}/excel${query}`;
  },

  getExportQuestionBankExcelUrl(subjectId: number, unit?: number, setOrigin?: string, isExtraPool?: boolean): string {
    return this.getExportQBExcelUrl(subjectId, unit, setOrigin, isExtraPool);
  },

  getExportQuestionBankDocxUrl(subjectId: number, unit?: number, setOrigin?: string, isExtraPool?: boolean): string {
    const params = new URLSearchParams();
    if (unit !== undefined && unit !== null) params.append('unit', unit.toString());
    if (setOrigin) params.append('set_origin', setOrigin);
    if (isExtraPool !== undefined && isExtraPool !== null) params.append('is_extra_pool', isExtraPool.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return `${API_BASE_URL}/export/question-bank/${subjectId}/docx${query}`;
  },

  getExportQuestionBankPdfUrl(subjectId: number, unit?: number, setOrigin?: string, isExtraPool?: boolean): string {
    const params = new URLSearchParams();
    if (unit !== undefined && unit !== null) params.append('unit', unit.toString());
    if (setOrigin) params.append('set_origin', setOrigin);
    if (isExtraPool !== undefined && isExtraPool !== null) params.append('is_extra_pool', isExtraPool.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return `${API_BASE_URL}/export/question-bank/${subjectId}/pdf${query}`;
  },

  getExportVerifiedDossierUrl(qpId: number): string {
    return `${API_BASE_URL}/export/verified-dossier/${qpId}`;
  },

  // Outcome-Based Education (OBE) & NBA Accreditation
  async getOBEMatrix(subjectId: number): Promise<OBEMatrixData> {
    const res = await fetch(`${API_BASE_URL}/obe/subject/${subjectId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch OBE matrix');
    return res.json();
  },

  async autoGenerateCourseFramework(subjectId: number): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/obe/subject/${subjectId}/auto-generate-framework`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to synthesize course framework');
    return res.json();
  },

  async getCourseRequirementsFramework(subjectId: number): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/obe/subject/${subjectId}/requirements`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch course requirements framework');
    return res.json();
  },

  async updateCourseOutcome(subjectId: number, coId: number, data: Partial<CourseOutcome>): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/obe/subject/${subjectId}/co/${coId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update course outcome');
    return res.json();
  },

  async getQuestionPaperOBE(qpId: number): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/obe/question-paper/${qpId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch QP OBE distribution');
    return res.json();
  },

  getExportOBEExcelUrl(subjectId: number): string {
    return `${API_BASE_URL}/export/obe/${subjectId}/excel`;
  },

  getExportOBEPdfUrl(subjectId: number): string {
    return `${API_BASE_URL}/export/obe/${subjectId}/pdf`;
  }
};
