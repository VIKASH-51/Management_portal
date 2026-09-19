import React, { useState, useEffect } from 'react';
import { Subject, BookRecommendation, YouTubeTutorial } from '../types';
import { api } from '../services/api';
import { 
  Compass, Book, Video, Search, ExternalLink, 
  ShieldCheck, CheckCircle2, Bookmark, Clock 
} from 'lucide-react';

interface ResearchHubProps {
  subject: Subject | null;
  onOpenCreateCourse?: () => void;
}

export const ResearchHub: React.FC<ResearchHubProps> = ({ subject, onOpenCreateCourse }) => {
  const [activeSubTab, setActiveSubTab] = useState<'BOOKS' | 'YOUTUBE' | 'CITATIONS'>(subject ? 'BOOKS' : 'CITATIONS');
  const [books, setBooks] = useState<BookRecommendation[]>([]);
  const [youtube, setYoutube] = useState<YouTubeTutorial[]>([]);
  const [citations, setCitations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(subject ? `${subject.name} principles and standards` : 'Machine Learning neural network architectures');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResources = async () => {
      if (!subject?.id) {
        setBooks([]);
        setYoutube([]);
        return;
      }
      try {
        setLoading(true);
        const [booksData, ytData] = await Promise.all([
          api.getBooks(subject.id),
          api.getYouTube(subject.id)
        ]);
        setBooks(booksData);
        setYoutube(ytData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, [subject?.id]);

  const handleSearchCitations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setLoading(true);
      const results = await api.searchReferences(searchQuery.trim());
      setCitations(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Academic Research & Educational Resource Hub
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {subject ? `Subject: ${subject.code} — ${subject.name}` : 'Autonomous Research Literature & Reference Citations'}
          </p>
        </div>

        {/* SubTab Toggle */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveSubTab('BOOKS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeSubTab === 'BOOKS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Book className="w-3.5 h-3.5" />
            Textbooks {subject ? `(${books.length})` : ''}
          </button>
          <button
            onClick={() => setActiveSubTab('YOUTUBE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeSubTab === 'YOUTUBE' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            Video Tutorials {subject ? `(${youtube.length})` : ''}
          </button>
          <button
            onClick={() => {
              setActiveSubTab('CITATIONS');
              if (citations.length === 0) handleSearchCitations({ preventDefault: () => {} } as any);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeSubTab === 'CITATIONS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Verified Citations
          </button>
        </div>
      </div>

      {/* No Subject Alert Banner for course-specific resources */}
      {!subject && activeSubTab !== 'CITATIONS' && (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-md">
          <Compass className="w-8 h-8 text-indigo-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Course Workspace Not Selected</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Create or select a course to automatically generate prescribed textbook lists and syllabus-aligned video lectures. You can also search live research citations using the <strong>Verified Citations</strong> tab.
          </p>
          {onOpenCreateCourse && (
            <button
              onClick={onOpenCreateCourse}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
            >
              + Create Course / Subject
            </button>
          )}
        </div>
      )}

      {/* BOOKS TAB */}
      {activeSubTab === 'BOOKS' && subject && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {books.map((book, idx) => (
            <div key={idx} className="academic-glass bg-white dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 academic-card-hover shadow-xl">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Bookmark className="w-4 h-4" />
                </div>
                {book.isbn && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    ISBN: {book.isbn}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{book.title}</h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-300 font-medium">{book.author}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{book.edition} • {book.publisher}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
                <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                  <strong className="text-slate-900 dark:text-slate-200">Pedagogical Value: </strong>
                  {book.why_useful}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  <strong className="text-slate-700 dark:text-slate-300">Syllabus Alignment: </strong>
                  {book.topic_coverage}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* YOUTUBE TAB */}
      {activeSubTab === 'YOUTUBE' && subject && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {youtube.map((vid, idx) => (
            <div key={idx} className="academic-glass bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 academic-card-hover shadow-xl">
              <div className="flex items-start justify-between">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 font-semibold flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  {vid.channel}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {vid.duration}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{vid.title}</h4>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5 font-medium">{vid.topic}</p>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {vid.explanation}
              </p>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <a
                  href={vid.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  Watch Lecture Video <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CITATIONS SEARCH TAB */}
      {activeSubTab === 'CITATIONS' && (
        <div className="space-y-4">
          <form onSubmit={handleSearchCitations} className="academic-glass bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex gap-2 shadow-xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search IEEE, MDN, RFCs, W3Schools, or GeeksforGeeks..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
            />
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shrink-0 shadow-lg"
            >
              Search
            </button>
          </form>

          <div className="space-y-3">
            {citations.map((cite, idx) => (
              <div key={idx} className="academic-glass bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 font-bold border border-slate-200 dark:border-slate-800">
                    {cite.source}
                  </span>
                  <a
                    href={cite.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    Visit Source <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{cite.title}</h4>
                <p className="text-xs text-slate-700 dark:text-slate-300">{cite.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
