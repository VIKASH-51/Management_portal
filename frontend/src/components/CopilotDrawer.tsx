import React, { useState } from 'react';
import { Subject } from '../types';
import { api } from '../services/api';
import { 
  Sparkles, X, Send, Bot, User, 
  CheckCircle2, ArrowRight, CornerDownLeft 
} from 'lucide-react';

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  onNavigateTab: (tab: any) => void;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  steps?: string[];
  suggested_actions?: Array<{ label: string; prompt: string }>;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  isOpen,
  onClose,
  subject,
  onNavigateTab
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: `Hello Professor. I am your **Academic AI Assistant** for **${subject ? subject.name : 'your course'}**.\n\nI can synthesize classroom lecture notes, generate multi-set examination question papers with zero cross-set duplicates, compile step-marking answer keys, and analyze historical examination trends.`,
      suggested_actions: [
        { label: 'Generate Unit 4 Notes', prompt: 'Prepare lecture notes for Unit 4 TCP Congestion Control.' },
        { label: 'Create 3 QP Sets', prompt: 'Generate 3 balanced question paper sets with 100 marks.' },
        { label: 'Analyze Exam Trends', prompt: 'Show 5-year historical topic weightage and recurring trends.' }
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const newMsgs = [...messages, { sender: 'user' as const, text: query }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chatCopilot(subject?.id, query);
      setMessages([...newMsgs, {
        sender: 'assistant',
        text: res.response,
        steps: res.agent_steps,
        suggested_actions: res.suggested_actions
      }]);
    } catch (err) {
      setMessages([...newMsgs, {
        sender: 'assistant',
        text: 'Sorry, I encountered an issue processing your query. Please check that the backend server is running.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 md:w-[420px] academic-glass bg-white/95 dark:bg-slate-950/95 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200 transition-colors">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Subject AI Copilot
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono">
                {subject?.code || 'ACTIVE'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Humanized Faculty Co-pilot</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`p-3.5 rounded-2xl text-xs max-w-[90%] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm shadow-md'
                  : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm space-y-2 shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Agent execution steps */}
              {msg.steps && msg.steps.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                  {msg.steps.map((st, sIdx) => (
                    <div key={sIdx} className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>{st}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suggested action buttons */}
            {msg.suggested_actions && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {msg.suggested_actions.map((act, aIdx) => (
                  <button
                    key={aIdx}
                    onClick={() => handleSend(act.prompt)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-800 flex items-center gap-1 transition shadow-xs"
                  >
                    <span>{act.label}</span>
                    <ArrowRight className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-xs text-indigo-600 dark:text-indigo-400 p-2">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>Consulting pedagogical knowledge base...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask copilot about ${subject?.code || 'course'}...`}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition shrink-0 shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
