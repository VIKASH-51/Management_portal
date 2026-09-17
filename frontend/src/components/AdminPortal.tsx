import React, { useState, useEffect } from 'react';
import { SystemHealth, User, AuditLogItem, AIUsageSummary } from '../types';
import { api } from '../services/api';
import { 
  ShieldCheck, Activity, Users, DollarSign, 
  Database, Server, Cpu, Clock, CheckCircle2, AlertTriangle, Shield,
  UserCheck, UserX, Trash2, Check, X, Sparkles, AlertCircle,
  FileCheck, FileSpreadsheet, Eye, Award, BookOpen, MessageSquare
} from 'lucide-react';

interface AdminPortalProps {
  currentUser?: User | null;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ currentUser }) => {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isDean = currentUser?.role === 'ADMIN';

  const [activeSubTab, setActiveSubTab] = useState<'APPROVALS' | 'EXAM_APPROVALS' | 'USERS' | 'HEALTH' | 'AI_COST' | 'AUDIT'>('APPROVALS');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [aiUsage, setAiUsage] = useState<AIUsageSummary | null>(null);
  const [questionPapers, setQuestionPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingUser, setProcessingUser] = useState<number | null>(null);
  const [processingQP, setProcessingQP] = useState<number | null>(null);
  const [deanNotes, setDeanNotes] = useState<{ [id: number]: string }>({});

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [h, u, a, logs, qps] = await Promise.all([
        api.getSystemHealth().catch(() => null),
        api.getAllUsers().catch(() => []),
        api.getAIUsage().catch(() => null),
        api.getAuditLogs().catch(() => []),
        api.getAdminQuestionPapers().catch(() => [])
      ]);
      if (h) setHealth(h);
      setUsers(u || []);
      if (a) setAiUsage(a);
      setAuditLogs(logs || []);
      setQuestionPapers(qps || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleStatus = async (userId: number) => {
    try {
      setProcessingUser(userId);
      const res = await api.toggleUserStatus(userId);
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: res.is_active } : u));
    } catch (err) {
      console.error(err);
      alert('Failed to toggle user status.');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleStaffApproval = async (userId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      setProcessingUser(userId);
      const res = await api.handleStaffApproval(userId, status);
      setUsers(users.map(u => u.id === userId ? { ...u, approval_status: res.approval_status as any, is_active: res.is_active } : u));
    } catch (err) {
      console.error(err);
      alert(`Failed to ${status.toLowerCase()} staff account.`);
    } finally {
      setProcessingUser(null);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string, userRole?: string) => {
    if (userRole === 'SUPER_ADMIN') {
      alert('Cannot delete the primary Super Admin institutional account.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete user account: "${userName}"? This cannot be undone.`)) {
      return;
    }

    try {
      setProcessingUser(userId);
      await api.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete user account.');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleApproveQP = async (qpId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      setProcessingQP(qpId);
      const note = deanNotes[qpId] || (status === 'APPROVED' ? 'Officially approved & stamped by Dean of Academic Affairs' : 'Revision requested by Academic Office');
      await api.approveAdminQuestionPaper(qpId, status, note);
      
      // Update local state
      setQuestionPapers(questionPapers.map(qp => {
        if (qp.id === qpId) {
          return {
            ...qp,
            status,
            verification_status: status,
            verified_by: `${currentUser?.full_name || 'Dean'} (${currentUser?.designation || 'Academic Dean'})`,
            verifier_notes: note
          };
        }
        return qp;
      }));
    } catch (err: any) {
      console.error(err);
      alert(err.message || `Failed to ${status.toLowerCase()} question paper.`);
    } finally {
      setProcessingQP(null);
    }
  };

  const pendingUsers = users.filter(u => u.approval_status === 'PENDING');
  const approvedUsers = users.filter(u => u.approval_status === 'APPROVED' || !u.approval_status);
  const pendingQPs = questionPapers.filter(qp => qp.status === 'PENDING' || qp.verification_status === 'PENDING');
  const approvedQPs = questionPapers.filter(qp => qp.status === 'APPROVED' || qp.status === 'VERIFIED');

  if (loading && !health && users.length === 0) {
    return (
      <div className="academic-glass bg-white dark:bg-slate-900/80 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        Loading institutional governance console...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            {isSuperAdmin ? 'Super Admin System & Platform Governance' : 'Dean of Academic Affairs Governance Console'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isSuperAdmin 
              ? 'Institutional Chancellor Level Control • Multi-Tenant Isolation • System Health & AI Telemetry • Role Administration'
              : 'Academic Dean & COE Controls • Faculty Onboarding & Profile Approvals • Institutional Question Paper Review & Verification'
            }
          </p>
        </div>

        {/* SubTab switcher */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('APPROVALS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
              activeSubTab === 'APPROVALS' ? 'bg-amber-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Staff Approvals
            {pendingUsers.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('EXAM_APPROVALS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
              activeSubTab === 'EXAM_APPROVALS' ? 'bg-amber-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Exam Approvals ({questionPapers.length})
          </button>

          <button
            onClick={() => setActiveSubTab('USERS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
              activeSubTab === 'USERS' ? 'bg-amber-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Faculty & Users ({users.length})
          </button>

          {isSuperAdmin && (
            <>
              <button
                onClick={() => setActiveSubTab('HEALTH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                  activeSubTab === 'HEALTH' ? 'bg-amber-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Health
              </button>
              <button
                onClick={() => setActiveSubTab('AI_COST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                  activeSubTab === 'AI_COST' ? 'bg-amber-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                AI Spend
              </button>
              <button
                onClick={() => setActiveSubTab('AUDIT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                  activeSubTab === 'AUDIT' ? 'bg-amber-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Audit
              </button>
            </>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: STAFF APPROVALS & PERMIT */}
      {activeSubTab === 'APPROVALS' && (
        <div className="space-y-6">
          {/* Pending Alerts */}
          {pendingUsers.length > 0 ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    {pendingUsers.length} New Staff Registration{pendingUsers.length > 1 ? 's' : ''} Awaiting Admin Permit
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Only Dean / Academic Admin can permit new faculty members to access the institute workspace.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  All Staff Registrations are Up to Date
                </h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  No pending faculty applications in the approval queue.
                </p>
              </div>
            </div>
          )}

          {/* Pending Applications List */}
          <div className="academic-glass bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                Pending Staff Registrations Queue ({pendingUsers.length})
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Requires Dean / Admin Verification
              </span>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No pending staff registrations currently waiting.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {pendingUsers.map((u) => (
                  <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{u.full_name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                          {u.role}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-yellow-50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-500/30">
                          PENDING APPROVAL
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {u.email} • {u.department || 'General Faculty'} • {u.designation || 'Lecturer'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Institution: {u.institution || 'Autonomous Institute'} • Tenant: {u.tenant_id}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {u.role === 'ADMIN' && !isSuperAdmin ? (
                        <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          Requires Super Admin Approval
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStaffApproval(u.id, 'APPROVED')}
                            disabled={processingUser === u.id}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Permit / Approve
                          </button>

                          <button
                            onClick={() => handleStaffApproval(u.id, 'REJECTED')}
                            disabled={processingUser === u.id}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approved Staff Directory */}
          <div className="academic-glass bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                Permitted Faculty & Administrative Members ({approvedUsers.length})
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Active Staff Roster
              </span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {approvedUsers.map((u) => (
                <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{u.full_name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        u.role === 'SUPER_ADMIN' 
                          ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30' 
                          : u.role === 'ADMIN'
                            ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                            : 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                      }`}>
                        {u.role}
                      </span>
                      <span className={`text-[10px] px-2 py-0.2 rounded font-semibold ${
                        u.is_active ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10'
                      }`}>
                        {u.is_active ? 'LOGIN ACTIVE' : 'LOGIN SUSPENDED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{u.email} • {u.department || 'Faculty'} • {u.designation || 'Lecturer'}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {u.role !== 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        disabled={processingUser === u.id}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          u.is_active
                            ? 'bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                        }`}
                      >
                        {u.is_active ? 'Suspend Login' : 'Activate Login'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: EXAM APPROVALS (DEAN OF ACADEMIC AFFAIRS / COE) */}
      {activeSubTab === 'EXAM_APPROVALS' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Award className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Dean of Academic Affairs & COE Official Examination Approval Hub
                </h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Review faculty question papers, verify Bloom&apos;s taxonomy compliance, and grant official Dean Verification Stamps.
                </p>
              </div>
            </div>
          </div>

          <div className="academic-glass bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                All Faculty Submitted Examination Sets ({questionPapers.length})
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Institutional Quality & Security Assurance
              </span>
            </div>

            {questionPapers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No examination question papers submitted for approval yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {questionPapers.map((qp) => {
                  const isApproved = qp.status === 'APPROVED' || qp.verification_status === 'APPROVED' || qp.status === 'VERIFIED';
                  const isRejected = qp.status === 'REJECTED' || qp.verification_status === 'REJECTED';

                  return (
                    <div key={qp.id} className="p-5 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {qp.title}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {qp.subject_code} — {qp.subject_name}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isApproved 
                                ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                                : isRejected
                                  ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                                  : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                            }`}>
                              {isApproved ? 'DEAN APPROVED & STAMPED' : isRejected ? 'REJECTED / REVISION REQUIRED' : 'AWAITING DEAN APPROVAL'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Instructor: <span className="font-semibold text-slate-700 dark:text-slate-300">{qp.faculty_name}</span> ({qp.faculty_email}) • Dept: {qp.department} • Total Marks: {qp.total_marks}M • {qp.sets_count} Sets • Duration: {qp.duration_minutes} Mins
                          </p>

                          {qp.verified_by && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approved by: {qp.verified_by} {qp.verifier_notes && `— "${qp.verifier_notes}"`}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => handleApproveQP(qp.id, 'APPROVED')}
                            disabled={processingQP === qp.id || isApproved}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                              isApproved 
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 cursor-default'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            {isApproved ? 'Dean Stamped' : 'Grant Dean Stamp'}
                          </button>

                          <button
                            onClick={() => handleApproveQP(qp.id, 'REJECTED')}
                            disabled={processingQP === qp.id || isRejected}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                              isRejected 
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 cursor-default'
                                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      </div>

                      {/* Optional Remarks input for Dean */}
                      {!isApproved && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Add Dean remarks / COE verification stamp note..."
                            value={deanNotes[qp.id] || ''}
                            onChange={(e) => setDeanNotes({ ...deanNotes, [qp.id]: e.target.value })}
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ALL USER LOGINS & RBAC */}
      {activeSubTab === 'USERS' && (
        <div className="academic-glass bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 dark:text-white">Institutional Faculty Roster & System Accounts ({users.length})</span>
            <span className="text-slate-500 dark:text-slate-400">Strict Tenant Data Isolation</span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{u.full_name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      u.role === 'SUPER_ADMIN' 
                        ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30' 
                        : u.role === 'ADMIN'
                          ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                          : 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                    }`}>
                      {u.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : u.role === 'ADMIN' ? 'DEAN (ADMIN)' : 'FACULTY'}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      u.is_active ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10'
                    }`}>
                      {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    {u.approval_status && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                        u.approval_status === 'APPROVED' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : u.approval_status === 'PENDING' ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' : 'text-rose-600 bg-rose-50 dark:bg-rose-500/10'
                      }`}>
                        {u.approval_status}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{u.email} • {u.department || 'Faculty'} • {u.designation || 'Faculty Member'}</p>
                </div>

                <div className="flex items-center space-x-2">
                  {u.role !== 'SUPER_ADMIN' && (
                    <>
                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        disabled={processingUser === u.id}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          u.is_active
                            ? 'bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                        }`}
                      >
                        {u.is_active ? 'Set Inactive' : 'Set Active'}
                      </button>

                      {isSuperAdmin && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.full_name, u.role)}
                          disabled={processingUser === u.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition"
                          title="Delete user account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SYSTEM HEALTH (SUPER ADMIN) */}
      {activeSubTab === 'HEALTH' && isSuperAdmin && health && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="academic-glass bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">API Status</span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" />
                {health.api_uptime}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Uvicorn / FastAPI Core</p>
            </div>

            <div className="academic-glass bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Database</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {health.database_status}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">SQLAlchemy ORM + Tenant Isolation</p>
            </div>

            <div className="academic-glass bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Vector Store</span>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                <Server className="w-4 h-4" />
                {health.vector_store_status}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">BM25 / Jaccard / Cosine Vector Index</p>
            </div>

            <div className="academic-glass bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Active AI Provider</span>
              <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mt-1 flex items-center gap-1.5 truncate">
                <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {health.active_ai_provider}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Autonomous Agent Orchestrator</p>
            </div>
          </div>

          <div className="academic-glass bg-white dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">System Resource & Object Isolation Telemetry</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-slate-500 dark:text-slate-400">Total Users</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{health.total_users}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-slate-500 dark:text-slate-400">Active Subjects</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{health.total_subjects}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-slate-500 dark:text-slate-400">RAG Documents</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{health.total_documents}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-slate-500 dark:text-slate-400">Generated Exam Sets</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{health.total_question_papers * 3}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: AI COST & TOKENS (SUPER ADMIN) */}
      {activeSubTab === 'AI_COST' && isSuperAdmin && aiUsage && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="academic-glass bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tokens Consumed</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {aiUsage.summary.total_tokens_consumed.toLocaleString()}
              </div>
            </div>
            <div className="academic-glass bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Estimated Spend</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                ${aiUsage.summary.estimated_cost_usd} USD
              </div>
            </div>
            <div className="academic-glass bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total API Requests</span>
              <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">
                {aiUsage.summary.total_requests}
              </div>
            </div>
            <div className="academic-glass bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Avg Agent Latency</span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-300 mt-1">
                {aiUsage.summary.average_latency_ms} ms
              </div>
            </div>
          </div>

          <div className="academic-glass bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
              Recent AI Generation Metrics
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {aiUsage.recent_metrics.map((m) => (
                <div key={m.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{m.agent_name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{m.provider} • {m.model} • {m.latency_ms}ms</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-700 dark:text-indigo-300">{m.total_tokens} tokens</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">${m.estimated_cost}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: AUDIT LOGS (SUPER ADMIN) */}
      {activeSubTab === 'AUDIT' && isSuperAdmin && (
        <div className="academic-glass bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 dark:text-white">System Security & Operation Audit Logs</span>
            <span className="text-slate-500 dark:text-slate-400">Chronological Event Stream</span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800/80 max-h-[600px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition flex items-start justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      [{log.action}]
                    </span>
                    <span className="text-slate-900 dark:text-slate-200 font-semibold">{log.user_email}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Resource: {log.resource_type} #{log.resource_id} • IP: {log.ip_address}
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
