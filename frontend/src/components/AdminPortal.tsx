import React, { useState, useEffect } from 'react';
import { SystemHealth, User, AuditLogItem, AIUsageSummary, DeletionRequest, RoleItem, PermissionItem, LoginLogItem } from '../types';
import { api } from '../services/api';
import { 
  ShieldCheck, Activity, Users, DollarSign, 
  Database, Server, Cpu, Clock, CheckCircle2, AlertTriangle, Shield,
  UserCheck, UserX, Trash2, Check, X, Sparkles, AlertCircle,
  FileCheck, FileSpreadsheet, Eye, Award, BookOpen, MessageSquare,
  KeyRound, UserMinus, ShieldAlert, CheckSquare, Square
} from 'lucide-react';

interface AdminPortalProps {
  currentUser?: User | null;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ currentUser }) => {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isDean = currentUser?.role === 'DEAN' || currentUser?.role === 'ADMIN';

  const [activeSubTab, setActiveSubTab] = useState<'DELETION_REQUESTS' | 'APPROVALS' | 'USERS' | 'EXAM_APPROVALS' | 'RBAC_ROLES' | 'AUDIT' | 'HEALTH' | 'AI_COST'>('APPROVALS');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLogItem[]>([]);
  const [aiUsage, setAiUsage] = useState<AIUsageSummary | null>(null);
  const [questionPapers, setQuestionPapers] = useState<any[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Deletion Request Modal (for Dean/SuperAdmin)
  const [isDelReqModalOpen, setIsDelReqModalOpen] = useState(false);
  const [delTargetUserId, setDelTargetUserId] = useState<number | null>(null);
  const [delReason, setDelReason] = useState('');

  // Permanent Delete Modal (SuperAdmin only)
  const [isPermDeleteModalOpen, setIsPermDeleteModalOpen] = useState(false);
  const [permDeleteTarget, setPermDeleteTarget] = useState<User | null>(null);
  const [permConfirmEmail, setPermConfirmEmail] = useState('');
  const [permDeleteError, setPermDeleteError] = useState<string | null>(null);

  // Exam Paper Review Notes
  const [deanNotes, setDeanNotes] = useState<{ [id: number]: string }>({});

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [h, u, delReqs, a, qps] = await Promise.all([
        api.getSystemHealth().catch(() => null),
        api.getAllUsers().catch(() => []),
        api.getDeletionRequests().catch(() => []),
        api.getAIUsage().catch(() => null),
        api.getAdminQuestionPapers().catch(() => [])
      ]);
      if (h) setHealth(h);
      setUsers(u || []);
      setDeletionRequests(delReqs || []);
      if (a) setAiUsage(a);
      setQuestionPapers(qps || []);

      if (isSuperAdmin) {
        const [logs, lLogs, r, p] = await Promise.all([
          api.getAuditLogs().catch(() => []),
          api.getLoginLogs().catch(() => []),
          api.getRoles().catch(() => []),
          api.getPermissions().catch(() => [])
        ]);
        setAuditLogs(logs || []);
        setLoginLogs(lLogs || []);
        setRoles(r || []);
        setPermissions(p || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentUser]);

  const handleToggleStatus = async (userId: number) => {
    try {
      setProcessingId(userId);
      const res = await api.toggleUserStatus(userId);
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: res.is_active, account_status: res.is_active ? 'ACTIVE' : 'DEACTIVATED' } : u));
    } catch (err: any) {
      alert(err.message || 'Failed to toggle user status.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUserApproval = async (userId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      setProcessingId(userId);
      const res = await api.handleStaffApproval(userId, status);
      setUsers(users.map(u => u.id === userId ? {
        ...u,
        approval_status: res.approval_status as any,
        account_status: res.account_status as any,
        is_active: res.is_active
      } : u));
    } catch (err: any) {
      alert(err.message || `Failed to ${status.toLowerCase()} account.`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateDeletionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delTargetUserId || !delReason.trim()) {
      alert('Please select a target user and provide a detailed reason.');
      return;
    }
    try {
      setLoading(true);
      await api.createDeletionRequest(delTargetUserId, delReason.trim());
      setIsDelReqModalOpen(false);
      setDelTargetUserId(null);
      setDelReason('');
      await fetchAdminData();
      alert('Deletion request submitted successfully for Super Admin review.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit deletion request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDeletionRequest = async (requestId: number, action: 'APPROVE' | 'REJECT') => {
    try {
      setProcessingId(requestId);
      const res = await api.resolveDeletionRequest(requestId, action);
      setDeletionRequests(deletionRequests.map(r => r.id === requestId ? { ...r, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } : r));
      await fetchAdminData();
      alert(res.message || `Deletion request ${action.toLowerCase()}d successfully.`);
    } catch (err: any) {
      alert(err.message || `Failed to ${action.toLowerCase()} deletion request.`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenPermDelete = (user: User) => {
    setPermDeleteTarget(user);
    setPermConfirmEmail('');
    setPermDeleteError(null);
    setIsPermDeleteModalOpen(true);
  };

  const handleExecutePermanentDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permDeleteTarget) return;

    if (permConfirmEmail.trim().toLowerCase() !== permDeleteTarget.email.trim().toLowerCase()) {
      setPermDeleteError(`Email mismatch. You must type "${permDeleteTarget.email}" exactly.`);
      return;
    }

    try {
      setLoading(true);
      setPermDeleteError(null);
      await api.permanentDeleteUser(permDeleteTarget.id, permConfirmEmail.trim());
      setIsPermDeleteModalOpen(false);
      setPermDeleteTarget(null);
      await fetchAdminData();
      alert('User account was permanently deleted inside transaction. Historical audit logs preserved.');
    } catch (err: any) {
      setPermDeleteError(err.message || 'Permanent deletion failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExamPaper = async (qpId: number, status: 'VERIFIED' | 'REJECTED') => {
    try {
      setProcessingId(qpId);
      const notes = deanNotes[qpId] || (status === 'VERIFIED' ? 'Officially verified and approved by Academic Dean / CoE.' : 'Revision required by examination committee.');
      await api.approveAdminQuestionPaper(qpId, status, notes);
      setQuestionPapers(questionPapers.map(qp => qp.id === qpId ? { ...qp, status, verification_status: status, verified_by: currentUser?.full_name, verifier_notes: notes } : qp));
    } catch (err: any) {
      alert(err.message || 'Failed to update exam status.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingUsers = users.filter(u => u.approval_status === 'PENDING' || u.account_status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Institutional Administration & Governance Portal
            </h1>
            <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
              isSuperAdmin 
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}>
              {isSuperAdmin ? 'Super Administrator Access' : 'Academic Dean Access'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            3-Tier Relational RBAC Governance • Non-Destructive Lifecycle • Academic Examination Verification
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          {isDean && (
            <button
              onClick={() => setIsDelReqModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <UserMinus className="w-4 h-4" />
              <span>Request Staff Deactivation</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('APPROVALS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            activeSubTab === 'APPROVALS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Pending Registrations</span>
          {pendingUsers.length > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('DELETION_REQUESTS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            activeSubTab === 'DELETION_REQUESTS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <UserMinus className="w-4 h-4" />
          <span>Deletion Requests</span>
          {deletionRequests.filter(r => r.status === 'PENDING').length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
              {deletionRequests.filter(r => r.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('USERS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            activeSubTab === 'USERS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('EXAM_APPROVALS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            activeSubTab === 'EXAM_APPROVALS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Exam Paper Governance ({questionPapers.length})</span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setActiveSubTab('RBAC_ROLES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeSubTab === 'RBAC_ROLES'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>RBAC Roles & Permissions</span>
          </button>
        )}

        {isSuperAdmin && (
          <button
            onClick={() => setActiveSubTab('AUDIT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeSubTab === 'AUDIT'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Audit & Login Trail</span>
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('HEALTH')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            activeSubTab === 'HEALTH'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>System Health</span>
        </button>

        <button
          onClick={() => setActiveSubTab('AI_COST')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            activeSubTab === 'AI_COST'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>AI Token Metrics</span>
        </button>
      </div>

      {/* Tab 1: Pending Registrations */}
      {activeSubTab === 'APPROVALS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              Pending Account Approvals
            </h2>
            <span className="text-xs text-slate-500">
              {pendingUsers.length} registration(s) awaiting approval
            </span>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
              <p className="text-xs font-medium">All user account registrations are verified and active.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400">
                    <th className="p-3 font-semibold">User</th>
                    <th className="p-3 font-semibold">Requested Role</th>
                    <th className="p-3 font-semibold">Department</th>
                    <th className="p-3 font-semibold">Contact</th>
                    <th className="p-3 font-semibold text-right">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {pendingUsers.map(u => {
                    const canApprove = isSuperAdmin || (isDean && u.role === 'STAFF');
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3">
                          <p className="font-semibold text-slate-900 dark:text-white">{u.full_name}</p>
                          <p className="text-slate-500 text-[11px]">{u.email}</p>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'DEAN' 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                          }`}>
                            {u.role === 'DEAN' ? 'Dean Office (Admin)' : 'Staff Member'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{u.department || 'N/A'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{u.contact || 'N/A'}</td>
                        <td className="p-3 text-right">
                          {canApprove ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleUserApproval(u.id, 'APPROVED')}
                                disabled={processingId === u.id}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs transition"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleUserApproval(u.id, 'REJECTED')}
                                disabled={processingId === u.id}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs transition"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              Requires Super Admin Approval
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Deletion Requests */}
      {activeSubTab === 'DELETION_REQUESTS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserMinus className="w-4 h-4 text-rose-600" />
                Staff Deletion & Deactivation Requests
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Deans submit deletion requests. Super Admin approves soft deactivation (preserving historical records).
              </p>
            </div>
            {isDean && (
              <button
                onClick={() => setIsDelReqModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>New Request</span>
              </button>
            )}
          </div>

          {deletionRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
              <p className="text-xs font-medium">No pending deletion requests in the queue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400">
                    <th className="p-3 font-semibold">Target User</th>
                    <th className="p-3 font-semibold">Requested By</th>
                    <th className="p-3 font-semibold">Reason</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {deletionRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{req.target_name || 'Staff'}</p>
                        <p className="text-slate-500 text-[11px]">{req.target_email}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{req.requester_name || 'Dean'}</p>
                        <p className="text-slate-500 text-[11px]">{req.requester_email}</p>
                      </td>
                      <td className="p-3 max-w-xs text-slate-600 dark:text-slate-300 text-[11px]">
                        {req.reason}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === 'APPROVED'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                            : req.status === 'REJECTED'
                            ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                        }`}>
                          {req.status === 'APPROVED' ? 'APPROVED (DEACTIVATED)' : req.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {req.status === 'PENDING' && isSuperAdmin ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResolveDeletionRequest(req.id, 'APPROVE')}
                              disabled={processingId === req.id}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs transition"
                              title="Approves request and performs soft deactivation"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve (Soft Deactivate)</span>
                            </button>
                            <button
                              onClick={() => handleResolveDeletionRequest(req.id, 'REJECT')}
                              disabled={processingId === req.id}
                              className="px-2.5 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs transition"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {req.status !== 'PENDING' ? `Resolved on ${new Date(req.created_at).toLocaleDateString()}` : 'Awaiting Super Admin Review'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: User Directory & Scoped RBAC */}
      {activeSubTab === 'USERS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Institutional User Directory & Field-Level Access
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isSuperAdmin 
                  ? 'Super Admin View: Complete user details, status toggling, and transactional permanent deletion.'
                  : 'Dean View: Permitted staff professional details. Higher-tier roles are field-restricted.'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400">
                  <th className="p-3 font-semibold">User / Name</th>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Role & Title</th>
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Contact</th>
                  <th className="p-3 font-semibold">Status</th>
                  {isSuperAdmin && <th className="p-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {users.map(u => {
                  const isTargetSuper = u.role === 'SUPER_ADMIN';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {u.full_name}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {u.email}
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                              : u.role === 'DEAN' || u.role === 'ADMIN'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                          }`}>
                            {u.role === 'DEAN' || u.role === 'ADMIN' ? 'Dean' : u.role}
                          </span>
                          <p className="text-[11px] text-slate-500">{u.designation || 'Academic Staff'}</p>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{u.department || 'N/A'}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{u.contact || 'N/A'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.is_active && u.account_status !== 'DEACTIVATED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                        }`}>
                          {u.account_status || (u.is_active ? 'ACTIVE' : 'DEACTIVATED')}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="p-3 text-right">
                          {!isTargetSuper && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleStatus(u.id)}
                                disabled={processingId === u.id}
                                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                                  u.is_active 
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                }`}
                                title={u.is_active ? 'Deactivate user account' : 'Activate user account'}
                              >
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleOpenPermDelete(u)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                                title="Permanently delete user with confirmation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Perm Delete</span>
                              </button>
                            </div>
                          )}
                          {isTargetSuper && (
                            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                              Protected
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Exam Paper Approvals */}
      {activeSubTab === 'EXAM_APPROVALS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              Examination Paper Verification & Accreditation Cell
            </h2>
            <span className="text-xs text-slate-500">{questionPapers.length} question paper(s)</span>
          </div>

          {questionPapers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 space-y-2">
              <FileSpreadsheet className="w-8 h-8 mx-auto text-blue-500 opacity-60" />
              <p className="text-xs font-medium">No question papers uploaded for verification yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questionPapers.map(qp => (
                <div key={qp.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">{qp.title}</h3>
                      <p className="text-[11px] text-slate-500">
                        {qp.subject_code} — {qp.subject_name} • Faculty: {qp.faculty_name} ({qp.faculty_email})
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold self-start sm:self-auto ${
                      qp.status === 'VERIFIED' || qp.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}>
                      {qp.status}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Add official Dean / CoE notes (optional)..."
                      value={deanNotes[qp.id] || ''}
                      onChange={(e) => setDeanNotes({ ...deanNotes, [qp.id]: e.target.value })}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveExamPaper(qp.id, 'VERIFIED')}
                        disabled={processingId === qp.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Exam</span>
                      </button>
                      <button
                        onClick={() => handleApproveExamPaper(qp.id, 'REJECTED')}
                        disabled={processingId === qp.id}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  {qp.verified_by && (
                    <p className="text-[11px] text-slate-500 italic">
                      Verified by: {qp.verified_by} • Notes: {qp.verifier_notes || 'Approved'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: RBAC Roles & Permissions (Super Admin Only) */}
      {activeSubTab === 'RBAC_ROLES' && isSuperAdmin && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-600" />
              Relational RBAC Matrix & Permission Definitions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              System Roles, Unique Constraints, and Permission Scopes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map(r => (
              <div key={r.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-purple-700 dark:text-purple-300">{r.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {r.id}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">{r.description}</p>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Granted Permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {r.permissions.map(p => (
                      <span key={p} className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-mono">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">All System Permissions ({permissions.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {permissions.map(p => (
                <div key={p.id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                  <p className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px]">{p.code}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Audit & Login Trail (Super Admin Only) */}
      {activeSubTab === 'AUDIT' && isSuperAdmin && (
        <div className="space-y-6">
          {/* Login Logs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              Authentication & Login History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400">
                    <th className="p-2.5 font-semibold">User Email</th>
                    <th className="p-2.5 font-semibold">Action</th>
                    <th className="p-2.5 font-semibold">IP Address</th>
                    <th className="p-2.5 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                  {loginLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-2.5 text-slate-800 dark:text-slate-200 font-sans">{l.user_email}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.action === 'LOGIN_SUCCESS' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' :
                          l.action === 'LOGIN_FAILED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300' :
                          'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {l.action}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500">{l.ip_address}</td>
                      <td className="p-2.5 text-slate-500 font-sans">{new Date(l.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Audit Logs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              Security & Resource Audit Trail (Preserved via SET NULL)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400">
                    <th className="p-2.5 font-semibold">User Email</th>
                    <th className="p-2.5 font-semibold">Action</th>
                    <th className="p-2.5 font-semibold">Resource</th>
                    <th className="p-2.5 font-semibold">Details</th>
                    <th className="p-2.5 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                  {auditLogs.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{a.user_email}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold">
                          {a.action}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500">{a.resource_type} {a.resource_id ? `#${a.resource_id}` : ''}</td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-400 font-mono text-[10px] max-w-xs truncate">
                        {typeof a.details === 'object' ? JSON.stringify(a.details) : a.details_json || '{}'}
                      </td>
                      <td className="p-2.5 text-slate-500">{new Date(a.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: System Health */}
      {activeSubTab === 'HEALTH' && health && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">System Status</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{health.status}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Database</p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{health.database_status}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Total Courses</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{health.total_subjects}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Active Users</p>
            <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{health.active_users} / {health.total_users}</p>
          </div>
        </div>
      )}

      {/* Tab 8: AI Cost & Token Metrics */}
      {activeSubTab === 'AI_COST' && aiUsage && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            AI Multimodal Inference & Token Consumption
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500">Total Tokens Consumed</p>
              <p className="text-lg font-bold text-blue-600 mt-1">{aiUsage.summary.total_tokens_consumed.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500">Total Inference Requests</p>
              <p className="text-lg font-bold text-purple-600 mt-1">{aiUsage.summary.total_requests}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500">Estimated Cost (USD)</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">${aiUsage.summary.estimated_cost_usd.toFixed(4)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Deletion Request (Dean & Super Admin) */}
      {isDelReqModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserMinus className="w-4 h-4 text-rose-600" />
                Submit Staff Deactivation Request
              </h3>
              <button onClick={() => setIsDelReqModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeletionRequest} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Select Staff User</label>
                <select
                  required
                  value={delTargetUserId || ''}
                  onChange={(e) => setDelTargetUserId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose a staff member --</option>
                  {users.filter(u => u.role === 'STAFF' && u.id !== currentUser?.id).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email}) - {u.department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Reason for Request</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide rationale for staff deactivation (e.g., faculty sabbatical, transfer, tenure end)..."
                  value={delReason}
                  onChange={(e) => setDelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDelReqModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Permanent Deletion with Confirmation Email (Super Admin Only) */}
      {isPermDeleteModalOpen && permDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Permanent User Deletion Warning
              </h3>
              <button onClick={() => setIsPermDeleteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 space-y-1">
              <p className="font-semibold">This action is permanent and cannot be undone.</p>
              <p>User credentials and personal settings will be deleted inside a database transaction. Historical audit logs are safely preserved via SET NULL.</p>
            </div>

            <form onSubmit={handleExecutePermanentDelete} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Account: <span className="font-bold text-slate-900 dark:text-white">{permDeleteTarget.full_name}</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Type the exact email <span className="font-mono font-bold text-slate-800 dark:text-slate-200 select-all">{permDeleteTarget.email}</span> below to confirm:
                </p>
                <input
                  type="email"
                  required
                  placeholder={permDeleteTarget.email}
                  value={permConfirmEmail}
                  onChange={(e) => setPermConfirmEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              {permDeleteError && (
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{permDeleteError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPermDeleteModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
                >
                  Permanently Delete User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
