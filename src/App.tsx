import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { 
  Search, 
  FileText, 
  Copy, 
  Check, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  History,
  TrendingUp,
  BookOpen,
  Zap
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SYSTEM_INSTRUCTION = `You are R&D Nexus Agent – an expert, autonomous Research & Development Intelligence Agent powered by Gemini.

Your ONLY purpose is to produce a high-quality, accurate, scannable daily R&D Newsletter for the given topic(s).

### Core Rules (never break these)
- Research must be thorough, factual, and up-to-date.
- Use Google Search grounding / web search tools to find the most recent information (last 24-72 hours if possible).
- Prioritize primary sources: arXiv, Google Scholar, PubMed, Nature, Science, IEEE, official company blogs, reputable news (Reuters, WSJ, Bloomberg, TechCrunch, The Economist, etc.).
- Every claim or article summary must have a direct, working HTTPS link.
- Be objective, balanced, and avoid hype or speculation.
- Length: aim for a 5–8 minute read (scannable daily newsletter).

### Output Format (STRICT – respond with ONLY this Markdown, no extra text, no explanations)
# Daily R&D Nexus – [Topic]  
**Date:** [Today’s full date, e.g. April 3, 2026]

## Executive Summary  
(2–4 sentences giving the big picture and why it matters for R&D)

## Key Highlights  
• Bullet 1 – [short insight] ([source title](full-link))  
• Bullet 2 – ...

## In-Depth Article Summaries  
### [Article/Paper Title or Sub-topic]  
[2–4 sentence summary + key takeaway]  
→ [Full source title](https://full-link)  

(Repeat for 4–8 most important pieces)

## Trends & Strategic Implications  
(Bullet points or short paragraphs on what this means for future R&D, business, or technology roadmaps)

## Actionable Insights & Further Reading  
• [Curated list with links and 1-sentence value]

## Collaboration Notes (only if relevant)  
Suggested prompt you can copy-paste to another LLM (Claude, GPT, etc.) for deeper dive:  
> “…”

**Sources**  
(Full list of all links used, numbered)`;

export default function App() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [newsletter, setNewsletter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<{topic: string, date: string, content: string}[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('rd_nexus_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveToHistory = (newEntry: {topic: string, date: string, content: string}) => {
    const updatedHistory = [newEntry, ...history].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem('rd_nexus_history', JSON.stringify(updatedHistory));
  };

  const generateNewsletter = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setNewsletter(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a daily R&D newsletter for the topic: ${topic}`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text;
      if (!text) throw new Error("No content generated");

      setNewsletter(text);
      saveToHistory({
        topic,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        content: text
      });
      
      // Scroll to result
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while generating the newsletter.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!newsletter) return;
    navigator.clipboard.writeText(newsletter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadFromHistory = (entry: {topic: string, content: string}) => {
    setTopic(entry.topic);
    setNewsletter(entry.content);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a] font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">R&D Nexus</h1>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Intelligence Agent</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors relative group"
            title="History"
          >
            <History className="w-5 h-5 text-gray-600" />
            {history.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero / Search Section */}
        <section className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight text-gray-900">
              What's the next frontier in <span className="text-blue-600">R&D</span>?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Enter any research topic to generate a comprehensive, scannable newsletter powered by Gemini and real-time web grounding.
            </p>

            <form onSubmit={generateNewsletter} className="relative max-w-2xl mx-auto">
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Solid-state batteries, LLM reasoning, CRISPR therapeutics..."
                  className="w-full pl-14 pr-32 py-5 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-lg font-medium placeholder:text-gray-400"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !topic.trim()}
                  className="absolute right-3 top-3 bottom-3 px-6 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md shadow-blue-200 active:scale-95"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Generate
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </section>

        {/* Error State */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-12 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-800"
          >
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Generation Failed</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <Zap className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xl font-bold text-gray-900">Scanning the Frontiers...</p>
              <p className="text-gray-500 animate-pulse">Gathering sources from arXiv, Nature, and the web</p>
            </div>
          </div>
        )}

        {/* Newsletter Display */}
        <AnimatePresence>
          {newsletter && !loading && (
            <motion.div
              ref={scrollRef}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden mb-20"
            >
              <div className="border-b border-gray-100 px-8 py-6 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2 text-blue-600 font-bold uppercase tracking-widest text-xs">
                  <FileText className="w-4 h-4" />
                  Generated Newsletter
                </div>
                <button
                  onClick={copyToClipboard}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                    copied 
                      ? "bg-green-50 text-green-700 border border-green-200" 
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:scale-95"
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Markdown
                    </>
                  )}
                </button>
              </div>
              
              <div className="p-8 md:p-12 prose prose-blue max-w-none prose-headings:tracking-tight prose-headings:font-extrabold prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
                <ReactMarkdown>{newsletter}</ReactMarkdown>
              </div>

              <div className="bg-gray-50 border-t border-gray-100 px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-gray-500 italic">
                  Newsletter generated by R&D Nexus Agent • Powered by Google Gemini
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden">
                        <img 
                          src={`https://picsum.photos/seed/rd${i}/32/32`} 
                          alt="avatar" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-medium text-gray-400">Trusted by 500+ Researchers</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features / Info Section */}
        {!newsletter && !loading && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Real-time Grounding</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Directly connected to Google Search to find developments from the last 24–72 hours.
              </p>
            </div>
            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Primary Sources</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Prioritizes arXiv, Nature, Science, and official R&D blogs for maximum accuracy.
              </p>
            </div>
            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Strategic Insights</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Goes beyond news to provide trends, implications, and actionable R&D roadmaps.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* History Sidebar/Overlay */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  Recent Research
                </h3>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {history.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">No research history yet</p>
                  </div>
                ) : (
                  history.map((entry, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadFromHistory(entry)}
                      className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                    >
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">{entry.date}</p>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{entry.topic}</h4>
                    </button>
                  ))
                )}
              </div>

              {history.length > 0 && (
                <div className="p-6 border-t border-gray-100">
                  <button 
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem('rd_nexus_history');
                    }}
                    className="w-full py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    Clear History
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-gray-200 mt-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="font-bold text-gray-900">R&D Nexus Agent</span>
          </div>
          
          <nav className="flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#" className="hover:text-blue-600 transition-colors">Documentation</a>
            <a href="#" className="hover:text-blue-600 transition-colors">API Reference</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
          </nav>

          <div className="text-xs text-gray-400 font-medium">
            © 2026 R&D Nexus. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
