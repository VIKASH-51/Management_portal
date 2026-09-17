export type Role = 'FACULTY' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  department: string;
  institution: string;
  designation: string;
  is_active: boolean;
  approval_status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  tenant_id: string;
}

export interface Unit {
  id?: number;
  unit_number: number;
  title: string;
  topics: string[];
  learning_outcomes?: string[];
  hours?: number;
}

export type SyllabusUnit = Unit;

export interface SectionConfig {
  name: string;
  title: string;
  questions_count: number;
  marks_per_question: number;
  choice_type: 'COMPULSORY' | 'INTERNAL_CHOICE' | 'OPEN_CHOICE';
  question_type?: 'MCQ' | 'FILL_IN_BLANKS' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'CASE_STUDY' | 'NUMERICAL' | 'CODE_ANALYSIS' | 'TRUE_FALSE' | 'MATCHING' | 'DESCRIPTIVE';
  unit_scope?: number[];
  open_choice_count?: number;
  custom_prompt_guidance?: string;
}

export interface Subject {
  id: number;
  code: string;
  name: string;
  department: string;
  regulation: string;
  semester: string;
  academic_year: string;
  description: string;
  units: Unit[];
  document_count?: number;
  notes_count?: number;
  question_paper_count?: number;
}

export interface DocumentItem {
  id: number;
  subject_id: number;
  filename: string;
  file_type: string;
  file_size: number;
  document_type: string;
  status: string;
  chunk_count: number;
  created_at: string;
}

export interface Note {
  id: number;
  subject_id: number;
  unit_number: number;
  topic: string;
  title: string;
  content_markdown: string;
  mermaid_diagram?: string;
  status: 'DRAFT' | 'AI_GENERATED' | 'UNDER_REVIEW' | 'APPROVED' | 'ARCHIVED';
  version: number;
  learning_objectives: string[];
  exam_points: string[];
  common_mistakes: string[];
  references: Array<{
    source: string;
    title: string;
    url: string;
    access_date: string;
    description: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface NoteVersion {
  id: number;
  note_id: number;
  version_number: number;
  content_markdown: string;
  mermaid_diagram?: string;
  created_at: string;
}

export interface QuestionItem {
  id?: number;
  section_name: string;
  question_number: number;
  sub_division?: string;
  question_text: string;
  marks: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  bloom_level: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
  unit_number: number;
  internal_choice_group?: string;
  question_type: string;
  co_mapped?: string;
  options?: string[];
  correct_answer?: string;
  explanation?: string;
  scenario_text?: string;
}

export interface QuestionPaperSet {
  id: number;
  set_code: string;
  title: string;
  items: QuestionItem[];
  validation: {
    total_marks?: number;
    target_marks?: number;
    marks_valid?: boolean;
    total_questions?: number;
    difficulty_distribution?: {
      easy_pct: number;
      med_pct: number;
      hard_pct: number;
    };
    bloom_distribution?: Record<string, number>;
    unit_distribution?: Record<number, number>;
    syllabus_coverage_pct?: number;
    passed_checks?: string[];
  };
}

export interface QuestionPaper {
  id: number;
  subject_id: number;
  title: string;
  regulation: string;
  semester: string;
  academic_year: string;
  exam_name: string;
  duration_minutes: number;
  total_marks: number;
  difficulty_easy_pct: number;
  difficulty_med_pct: number;
  difficulty_hard_pct: number;
  format_type: string;
  sets_count: number;
  validation_score: {
    total_sets_generated?: number;
    zero_duplicate_guarantee?: boolean;
    target_marks?: number;
    format?: string;
    status?: string;
  };
  status: string;
  created_at: string;
  sets: QuestionPaperSet[];
}

export interface TemplateBlueprint {
  filename: string;
  detected_title: string;
  detected_regulation: string;
  detected_duration_minutes: number;
  detected_total_marks: number;
  calculated_total_marks: number;
  sections_count: number;
  custom_sections: SectionConfig[];
  confidence_score: number;
  summary: string;
}

export interface VerificationReport {
  subject_id: number;
  question_paper_id?: number;
  verification_score: number;
  status: string;
  syllabus_alignment_pct: number;
  reference_coverage_pct: number;
  bloom_taxonomy_compliance: any;
  difficulty_rigor_check: any;
  verified_items_count: number;
  passed_audit_checks: string[];
  recommendations: string[];
  detailed_item_verifications: Array<{
    item_index: number;
    question_label: string;
    unit_number: number;
    bloom_level: string;
    question_type: string;
    overlap_score_pct: number;
    status: string;
    audit_badge: string;
  }>;
}

export interface AnswerKey {
  id: number;
  question_paper_id: number;
  set_code: string;
  title: string;
  content_markdown: string;
  marking_rubrics: Array<{
    question_label: string;
    question_text: string;
    marks: number;
    step_breakdown: Array<{ step: string; marks: number }>;
  }>;
  created_at: string;
}

export interface QuestionBankItem {
  id: number;
  subject_id: number;
  unit_number: number;
  topic: string;
  question_text: string;
  expected_answer?: string;
  marks: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  bloom_level: string;
  question_type: string;
  tags: string[];
  set_origin?: string;
  is_extra_pool?: boolean;
  co_mapped?: string;
  options?: string[];
  correct_answer?: string;
  explanation?: string;
  scenario_text?: string;
  created_at: string;
}

export interface TrendAnalysis {
  subject_code: string;
  subject_name: string;
  analysis_title: string;
  disclaimer: string;
  unit_weightage: Record<string, number>;
  recurring_topics: Array<{
    topic: string;
    frequency: string;
    average_marks: string;
    common_bloom_level: string;
  }>;
  bloom_distribution: Record<string, number>;
  recommendations_for_faculty: string[];
}

export interface BookRecommendation {
  title: string;
  author: string;
  edition: string;
  publisher: string;
  isbn?: string;
  why_useful: string;
  topic_coverage: string;
}

export interface YouTubeTutorial {
  title: string;
  channel: string;
  video_id?: string;
  topic_covered?: string;
  topic?: string;
  duration?: string;
  explanation?: string;
  url?: string;
}

export interface ResearchPaperRef {
  title: string;
  authors: string;
  venue: string;
  year: number;
  doi?: string;
  summary: string;
  pedagogical_value: string;
}

export interface VisionDiagramAnalysis {
  detected_topics: string[];
  blooms_level: string;
  confidence_score: number;
  extracted_labels: string[];
  academic_explanation: string;
  suggested_exam_questions: string[];
  suggested_mermaid_diagram?: string;
}

export interface FacultyPreference {
  id: number;
  user_id: number;
  key: string;
  value_json: string;
  created_at: string;
  updated_at: string;
}

export interface LearnedInsight {
  id: number;
  subject_id: number;
  insight_type: string;
  content: string;
  confidence: number;
  source_action: string;
  created_at: string;
}

export interface CourseOutcome {
  id: number;
  subject_id: number;
  co_code: string;
  description: string;
  bloom_level: string;
  unit_number: number;
  target_attainment_pct: number;
  po_mapping: Record<string, number>;
  created_at: string;
}

export interface OBEMatrixResponse {
  subject_id: number;
  subject_code: string;
  subject_name: string;
  regulation?: string;
  course_outcomes: CourseOutcome[];
  po_definitions: Record<string, string>;
  pso_definitions: Record<string, string>;
  articulation_matrix: any;
  qp_co_distribution?: any;
}

export type OBEMatrixData = OBEMatrixResponse;

export interface SystemHealth {
  status: string;
  api_uptime: string;
  database_status: string;
  vector_store_status: string;
  queue_status: string;
  total_users: number;
  active_users: number;
  total_subjects: number;
  total_documents: number;
  total_notes_generated: number;
  total_question_papers: number;
  active_ai_provider: string;
}

export interface AIUsageSummary {
  summary: {
    total_tokens_consumed: number;
    estimated_cost_usd: number;
    total_requests: number;
    average_latency_ms: number;
  };
  recent_metrics: AIUsageMetric[];
}

export interface AIUsageMetric {
  id: number;
  user_id?: number;
  subject_id?: number;
  agent_name: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  latency_ms: number;
  created_at?: string;
  timestamp?: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  tenant_id?: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details?: Record<string, any>;
  details_json?: string;
  ip_address: string;
  created_at: string;
}

export type AuditLogItem = AuditLog;


