import React, { useState, useEffect } from 'react';
import { Subject } from '../types';
import { api } from '../services/api';
import { 
  Brain, Globe, CheckCircle2, 
  Search, ShieldCheck, RefreshCw, Cpu, BookOpen
} from 'lucide-react';

interface LearningMemoryCenterProps {
  subject: Subject | null;
}

export const LearningMemoryCenter: React.FC<LearningMemoryCenterProps> = ({ subject }) => {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTopic, setSearchTopic] = useState('TCP Congestion Control RFC 5681');
  const [learning, setLearning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const data = await api.getAgentMemories();
      setMemories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleLearnFromWeb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTopic.trim()) return;

    try {
      setLearning(true);
      setMessage(null);
      const res = await api.triggerWebLearning(searchTopic.trim(), 'AutonomousAcademicAgent');
      setMessage(res.message);
      fetchMemories();
    } catch (err: any) {
      setMessage(`Error during knowledge research: ${err.message}`);
    } finally {
      setLearning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Curriculum Knowledge Base & Research Repository
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verified Academic Standards • Engineering RFCs • Dynamic Knowledge Enrichment for Courseware
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            Active Repository
          </span>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          {message}
        </div>
      )}

      {/* Autonomous Web Search Learning Trigger */}
      <div className="academic-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Enrich Repository with Academic & Standard Specifications
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Search external standard bodies (RFCs, IEEE standards, ACM guidelines) and inject verified technical principles into the courseware generator.
        </p>

        <form onSubmit={handleLearnFromWeb} className="flex gap-2">
          <input
            type="text"
            value={searchTopic}
            onChange={(e) => setSearchTopic(e.target.value)}
            placeholder="Enter academic topic, protocol standard, or algorithm specification..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={learning}
            className="btn-primary text-xs flex items-center gap-2 shrink-0 py-2 px-4"
          >
            {learning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Querying Standards...
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5" />
                Enrich Knowledge
              </>
            )}
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Suggested Topics:</span>
          <button
            type="button"
            onClick={() => setSearchTopic("TCP Congestion Control RFC 5681")}
            className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
          >
            TCP Congestion RFC 5681
          </button>
          <button
            type="button"
            onClick={() => setSearchTopic("Dijkstra vs Bellman Ford Routing")}
            className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
          >
            Dijkstra vs Bellman-Ford
          </button>
          <button
            type="button"
            onClick={() => setSearchTopic("Database 3NF vs BCNF")}
            className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
          >
            3NF vs BCNF Normalization
          </button>
        </div>
      </div>

      {/* Persistent Learned Memory Cards */}
      <div className="academic-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Verified Knowledge Records ({memories.length})
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            Available across all courseware generators
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Loading knowledge store...
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {memories.map((mem) => (
              <div key={mem.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-850 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {mem.agent_name}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{mem.concept_key}</h4>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Confidence: {(mem.confidence_score * 100).toFixed(0)}%
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">Referenced {mem.usage_count} times</span>
                  </div>
                </div>

                <p className="text-xs text-slate-800 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  {mem.learned_insight}
                </p>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-slate-400" />
                  <span>Source: {mem.source}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
