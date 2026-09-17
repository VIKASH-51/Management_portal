import React, { useState, useEffect } from 'react';
import { Subject, TrendAnalysis } from '../types';
import { api } from '../services/api';
import { TrendingUp, AlertCircle, Layers, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';

interface TrendAnalyzerProps {
  subject: Subject;
}

export const TrendAnalyzer: React.FC<TrendAnalyzerProps> = ({ subject }) => {
  const [trends, setTrends] = useState<TrendAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        const data = await api.getTrends(subject.id);
        setTrends(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrends();
  }, [subject.id]);

  if (loading) {
    return (
      <div className="academic-glass bg-white dark:bg-slate-900/80 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        Loading historical trend analysis...
      </div>
    );
  }

  if (!trends) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            5-Year Exam Topic Trend & Historical Analysis
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Retrospective Pattern Evaluation • Unit Marks Weightage • Recurring Question Frequencies
          </p>
        </div>
      </div>

      {/* Mandatory Disclaimer Alert */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-amber-700 dark:text-amber-300">Autonomous Examination Cell Notice: </strong>
          {trends.disclaimer}
        </div>
      </div>

      {/* Unit Weightage Distribution */}
      <div className="academic-glass bg-white dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Unit-wise Historical Marks Weightage Distribution
        </h3>

        <div className="space-y-3">
          {Object.entries(trends.unit_weightage || {}).map(([unitName, weight], idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-medium">{unitName}</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{weight}% Weight</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-slate-800">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${weight * 3.5}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High-Frequency Recurring Topics */}
      <div className="academic-glass bg-white dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          High-Frequency Recurring Examination Concepts
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(trends.recurring_topics || []).map((topic, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{topic.topic}</h4>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold">
                  {topic.frequency}
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 font-semibold">
                  Avg: {topic.average_marks}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {topic.common_bloom_level}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Faculty Recommendations Card */}
      <div className="academic-glass bg-white dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Autonomous College Faculty Preparation Recommendations
        </h3>
        <ul className="space-y-2">
          {(trends.recommendations_for_faculty || []).map((rec, idx) => (
            <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mt-1.5 shrink-0" />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
