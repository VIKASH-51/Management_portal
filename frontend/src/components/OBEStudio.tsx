import React, { useState, useEffect } from 'react';
import { Subject, OBEMatrixData, CourseOutcome } from '../types';
import { api } from '../services/api';
import { 
  Award, FileSpreadsheet, Download, CheckCircle2, 
  HelpCircle, Edit3, Save, X, Layers, TrendingUp,
  ShieldCheck, Check, ChevronDown, ChevronUp,
  Sliders, BookOpen, AlertCircle, RefreshCw
} from 'lucide-react';

interface OBEStudioProps {
  subject: Subject;
}

export const OBEStudio: React.FC<OBEStudioProps> = ({ subject }) => {
  const [activeTab, setActiveTab] = useState<'CO_DEFINITIONS' | 'CO_PO_MATRIX' | 'QP_ATTAINMENT' | 'REQUIREMENTS'>('CO_DEFINITIONS');
  const [obeData, setObeData] = useState<OBEMatrixData | null>(null);
  const [frameworkData, setFrameworkData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [editingCO, setEditingCO] = useState<CourseOutcome | null>(null);
  const [savingCO, setSavingCO] = useState(false);
  const [expandedPO, setExpandedPO] = useState<string | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const handleDownloadOBE = async (format: 'excel' | 'pdf') => {
    try {
      setDownloadingFormat(format);
      let url = '';
      let defaultName = `${subject.code}_NBA_OBE_Articulation_Matrix`;
      if (format === 'excel') {
        url = api.getExportOBEExcelUrl(subject.id);
        defaultName += '.xlsx';
      } else {
        url = api.getExportOBEPdfUrl(subject.id);
        defaultName += '.pdf';
      }
      await api.downloadFile(url, defaultName);
    } catch (err: any) {
      console.error('OBE export failed:', err);
      alert(`Failed to export ${format.toUpperCase()}: ` + (err.message || 'Server error'));
    } finally {
      setDownloadingFormat(null);
    }
  };

  const fetchOBE = async () => {
    try {
      setLoading(true);
      const data = await api.getOBEMatrix(subject.id);
      setObeData(data);
      const reqData = await api.getCourseRequirementsFramework(subject.id);
      setFrameworkData(reqData);
    } catch (err) {
      console.error('Failed to load OBE matrix', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGenerate = async () => {
    try {
      setAutoGenerating(true);
      const result = await api.autoGenerateCourseFramework(subject.id);
      setFrameworkData(result);
      await fetchOBE();
      alert(`Successfully synthesized CO1–CO5, 5x15 PO Matrix, Textbooks, and Course Requirements for ${subject.code}!`);
    } catch (err: any) {
      console.error('Auto-generate framework failed:', err);
      alert('Failed to synthesize course framework: ' + (err.message || 'Server error'));
    } finally {
      setAutoGenerating(false);
    }
  };

  useEffect(() => {
    fetchOBE();
  }, [subject.id]);

  const handleSaveCO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCO || !editingCO.id) return;

    try {
      setSavingCO(true);
      await api.updateCourseOutcome(subject.id, editingCO.id, {
        description: editingCO.description,
        bloom_level: editingCO.bloom_level,
        target_attainment_pct: editingCO.target_attainment_pct,
        po_mapping: editingCO.po_mapping
      });

      await fetchOBE();
      setEditingCO(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update Course Outcome.');
    } finally {
      setSavingCO(false);
    }
  };

  const handleMatrixCellChange = async (coId: number, poKey: string, newVal: number) => {
    if (!obeData) return;
    const targetCO = obeData.course_outcomes.find(c => c.id === coId);
    if (!targetCO || !targetCO.id) return;

    const updatedPoMap = { ...targetCO.po_mapping, [poKey]: newVal };

    // Optimistic UI update
    setObeData(prev => {
      if (!prev) return prev;
      const updatedCOs = prev.course_outcomes.map(c => 
        c.id === coId ? { ...c, po_mapping: updatedPoMap } : c
      );
      return { ...prev, course_outcomes: updatedCOs };
    });

    try {
      await api.updateCourseOutcome(subject.id, targetCO.id, {
        po_mapping: updatedPoMap
      });
      await fetchOBE();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !obeData) {
    return (
      <div className="academic-card p-8 text-center text-xs text-slate-500 dark:text-slate-400">
        Loading Outcome-Based Education (OBE) Matrix & NBA/NAAC articulation data...
      </div>
    );
  }

  const poKeys = obeData?.articulation_matrix.po_keys || [
    'PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9', 'PO10', 'PO11', 'PO12'
  ];
  const psoKeys = obeData?.articulation_matrix.pso_keys || ['PSO1', 'PSO2', 'PSO3'];
  const allOutcomeKeys = [...poKeys, ...psoKeys];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Outcome-Based Education (OBE) & Articulation Matrix
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              NBA / NAAC Compliance Tier-I & II
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Course Outcomes (CO1–CO5) • 5×15 Program Articulation Matrix • Prerequisites, Textbooks & Tools
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAutoGenerate}
            disabled={autoGenerating}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
            title="Auto-generate COs, PO Articulation, Textbooks and Requirements from syllabus"
          >
            {autoGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sliders className="w-3.5 h-3.5 text-indigo-200" />
            )}
            Auto-Generate COs & Requirements
          </button>

          <button
            onClick={() => handleDownloadOBE('excel')}
            disabled={downloadingFormat !== null}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Download Formatted NBA CO-PO Matrix (.xlsx)"
          >
            {downloadingFormat === 'excel' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            Export NBA Excel (.xlsx)
          </button>

          <button
            onClick={() => handleDownloadOBE('pdf')}
            disabled={downloadingFormat !== null}
            className="btn-primary text-xs flex items-center gap-1.5"
            title="Download Official OBE & Articulation PDF Summary"
          >
            {downloadingFormat === 'pdf' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('CO_DEFINITIONS')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'CO_DEFINITIONS'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          1. Course Outcomes (CO1–CO5)
        </button>

        <button
          onClick={() => setActiveTab('CO_PO_MATRIX')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'CO_PO_MATRIX'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          2. CO-PO & CO-PSO Articulation Matrix (5×15)
        </button>

        <button
          onClick={() => setActiveTab('QP_ATTAINMENT')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'QP_ATTAINMENT'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          3. Exam Question CO Attainment Weightage
        </button>

        <button
          onClick={() => setActiveTab('REQUIREMENTS')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'REQUIREMENTS'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          4. Prerequisites, Textbooks & Course Requirements
        </button>
      </div>

      {/* TAB 1: CO DEFINITIONS */}
      {activeTab === 'CO_DEFINITIONS' && obeData && (
        <div className="space-y-4">
          <div className="academic-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Defined Course Outcomes for {subject.code} — {subject.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  5 Syllabus Units mapped to Bloom's Taxonomy Cognitive Levels (Remember L1 → Create L6)
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                5 Active COs
              </span>
            </div>

            <div className="space-y-3">
              {obeData.course_outcomes.map((co) => (
                <div
                  key={co.co_code}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-white bg-blue-600 px-2 py-0.5 rounded">
                        {co.co_code}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        Unit {co.unit_number}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        Bloom: {co.bloom_level}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                        Target: {co.target_attainment_pct}% Attainment
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal pt-1">
                      {co.description}
                    </p>
                  </div>

                  <button
                    onClick={() => setEditingCO(co)}
                    className="btn-secondary text-xs flex items-center gap-1.5 shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Statement
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CO-PO ARTICULATION MATRIX */}
      {activeTab === 'CO_PO_MATRIX' && obeData && (
        <div className="space-y-6">
          {/* Matrix Card */}
          <div className="academic-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Course Articulation Matrix (CO-PO & CO-PSO Mapping)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Correlation Scale: <strong className="text-blue-600">3 = High / Substantial</strong> • <strong className="text-purple-600">2 = Moderate</strong> • <strong className="text-emerald-600">1 = Low / Slight</strong> • <strong className="text-slate-400">- = No Correlation</strong>
                </p>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>Select values to modify articulation weights</span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-2.5 text-left font-bold text-slate-800 dark:text-slate-200 min-w-[70px]">CO</th>
                    <th className="p-2.5 font-bold text-slate-800 dark:text-slate-200 min-w-[70px]">Level</th>
                    {poKeys.map((po) => (
                      <th
                        key={po}
                        onClick={() => setExpandedPO(expandedPO === po ? null : po)}
                        className="p-2 font-bold text-blue-700 dark:text-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/40 transition min-w-[42px]"
                        title={obeData.po_definitions[po]}
                      >
                        {po}
                      </th>
                    ))}
                    {psoKeys.map((pso) => (
                      <th
                        key={pso}
                        onClick={() => setExpandedPO(expandedPO === pso ? null : pso)}
                        className="p-2 font-bold text-purple-700 dark:text-purple-400 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950/40 transition min-w-[46px]"
                        title={obeData.pso_definitions[pso]}
                      >
                        {pso}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {obeData.course_outcomes.map((co) => (
                    <tr key={co.co_code} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                      <td className="p-2.5 text-left font-bold text-blue-700 dark:text-blue-400">
                        {co.co_code}
                      </td>
                      <td className="p-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {co.bloom_level.slice(0, 3)}
                      </td>
                      {allOutcomeKeys.map((k) => {
                        const val = co.po_mapping[k] || 0;
                        return (
                          <td key={k} className="p-1">
                            <select
                              value={val}
                              onChange={(e) => co.id && handleMatrixCellChange(co.id, k, Number(e.target.value))}
                              className={`w-9 py-1 text-center font-bold rounded border text-xs cursor-pointer transition ${
                                val === 3
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : val === 2
                                    ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                                    : val === 1
                                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                      : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <option value={0}>-</option>
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Calculated Averages Row */}
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                    <td className="p-2.5 text-left text-slate-900 dark:text-white">Avg</td>
                    <td className="p-2 text-slate-500 font-mono text-[11px]">Overall</td>
                    {allOutcomeKeys.map((k) => {
                      const avg = obeData.articulation_matrix.averages[k];
                      return (
                        <td key={k} className="p-2 font-mono text-xs text-blue-700 dark:text-blue-300">
                          {avg}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Program Outcomes (PO & PSO) Expandable Reference Accordion */}
          <div className="academic-card p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              NBA Standard Program Outcomes (PO1–PO12) & Program Specific Outcomes (PSO1–PSO3) Guide
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {allOutcomeKeys.map((k) => {
                const isPO = k.startsWith('PO');
                const def = isPO ? obeData.po_definitions[k] : obeData.pso_definitions[k];
                return (
                  <div key={k} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="font-bold text-blue-700 dark:text-blue-400 mr-1.5">{k}:</span>
                    <span className="text-slate-600 dark:text-slate-300">{def}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: QUESTION PAPER BLUEPRINT & ATTAINMENT */}
      {activeTab === 'QP_ATTAINMENT' && obeData && (
        <div className="space-y-6">
          <div className="academic-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Examination Blueprint & CO Attainment Distribution
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time mapping of examination marks to Course Outcomes (CO1–CO5) across all generated sets
                </p>
              </div>
            </div>

            {!obeData.qp_co_distribution || Object.keys(obeData.qp_co_distribution).length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <p>No question papers generated yet for this course.</p>
                <p className="text-[11px] text-slate-400">Generate an examination set in the Examination Workspace to view real-time attainment weightage.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(obeData.qp_co_distribution).map(([setCode, dist]: any) => (
                  <div key={setCode} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{setCode} Blueprint</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {dist.balance_status}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                        Total Marks: {dist.total_marks}M
                      </span>
                    </div>

                    {/* CO Bars */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      {['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].map((coKey) => {
                        const marks = dist.co_marks[coKey] || 0;
                        const pct = dist.co_percentage[coKey] || 0;
                        const count = dist.co_counts[coKey] || 0;
                        return (
                          <div key={coKey} className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-extrabold text-blue-700 dark:text-blue-400">{coKey}</span>
                              <span className="font-bold text-slate-900 dark:text-white">{marks} Marks</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(pct * 2.5, 100)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                              <span>{count} Questions</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{pct}% Weightage</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PREREQUISITES, TEXTBOOKS & COURSE REQUIREMENTS */}
      {activeTab === 'REQUIREMENTS' && frameworkData && (
        <div className="space-y-6">
          {/* Card 1: Prerequisites & Course Educational Objectives */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prerequisites */}
            <div className="academic-card p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Course Prerequisites & Prior Foundations
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  Required Knowledge
                </span>
              </div>
              <div className="space-y-2 pt-1">
                {(frameworkData.prerequisites || []).map((pr: string, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{pr}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Educational Objectives */}
            <div className="academic-card p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Course Educational Objectives (PEOs)
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  5 Core Goals
                </span>
              </div>
              <div className="space-y-2 pt-1">
                {(frameworkData.course_objectives || []).map((obj: string, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Recommended Textbooks & Reference Literature */}
          <div className="academic-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Prescribed Textbooks & Reference Literature
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Standard university curriculum reference citations with author, publisher and edition
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                NBA Verified Citations
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                  Prescribed Textbooks:
                </h4>
                {(frameworkData.recommended_textbooks || []).map((tb: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono">T{idx + 1}.</span>
                      <span>{tb.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      <strong>Author(s):</strong> {tb.author}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500">
                      {tb.publisher} • {tb.edition}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                  Reference Books:
                </h4>
                {(frameworkData.reference_books || []).map((rb: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="text-purple-600 dark:text-purple-400 font-mono">R{idx + 1}.</span>
                      <span>{rb.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      <strong>Author(s):</strong> {rb.author}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500">
                      {rb.publisher} • {rb.edition}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Computing, Software & Lab Tools */}
          <div className="academic-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Laboratory, Computing & Simulation Tool Specifications
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                Modern Tool Usage (PO5)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(frameworkData.computing_requirements || []).map((tool: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {tool.tool_name}
                  </div>
                  <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                    {tool.category}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {tool.spec}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Bloom's Assessment Plan & Weightage */}
          {frameworkData.blooms_distribution && (
            <div className="academic-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Bloom's Taxonomy Cognitive Distribution & Assessment Model
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Target: {frameworkData.blooms_distribution.nba_attainment_threshold}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                  <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                    {frameworkData.blooms_distribution.remember_pct}%
                  </div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Remember (L1)</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                  <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                    {frameworkData.blooms_distribution.understand_pct}%
                  </div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Understand (L2)</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {frameworkData.blooms_distribution.apply_pct}%
                  </div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Apply (L3)</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                  <div className="text-lg font-black text-purple-600 dark:text-purple-400">
                    {frameworkData.blooms_distribution.analyze_pct}%
                  </div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Analyze (L4)</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1">
                  <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                    {frameworkData.blooms_distribution.evaluate_create_pct}%
                  </div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Eval / Create (L5/L6)</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Continuous Internal Evaluation (CIE):</span> {frameworkData.blooms_distribution.internal_assessment_weightage}
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Autonomous End-Semester Exam (SEE):</span> {frameworkData.blooms_distribution.end_semester_weightage}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit CO Modal */}
      {editingCO && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Edit {editingCO.co_code} (Unit {editingCO.unit_number})
              </h3>
              <button
                onClick={() => setEditingCO(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCO} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course Outcome Statement
                </label>
                <textarea
                  rows={4}
                  value={editingCO.description}
                  onChange={(e) => setEditingCO({ ...editingCO, description: e.target.value })}
                  className="w-full bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bloom's Taxonomy Level
                  </label>
                  <select
                    value={editingCO.bloom_level}
                    onChange={(e) => setEditingCO({ ...editingCO, bloom_level: e.target.value })}
                    className="w-full bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="Remember">Remember (L1)</option>
                    <option value="Understand">Understand (L2)</option>
                    <option value="Apply">Apply (L3)</option>
                    <option value="Analyze">Analyze (L4)</option>
                    <option value="Evaluate">Evaluate (L5)</option>
                    <option value="Create">Create (L6)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Attainment (%)
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={100}
                    value={editingCO.target_attainment_pct}
                    onChange={(e) => setEditingCO({ ...editingCO, target_attainment_pct: Number(e.target.value) })}
                    className="w-full bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCO(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCO}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingCO ? 'Saving...' : 'Update Outcome'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
