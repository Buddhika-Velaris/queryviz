import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { BookOpen, Search, ChevronRight } from 'lucide-react';
import content from '../../../knowledge.md?raw';

interface Section {
  id: string;
  title: string;
  content: string;
  number: string;
}

function parseSections(md: string): Section[] {
  const sections: Section[] = [];
  // Split on lines that start a new ## N. heading
  const parts = md.split(/(?=^## \d+\. )/m);
  for (const part of parts) {
    const match = part.match(/^## (\d+)\. (.+)$/m);
    if (match) {
      sections.push({
        id: `section-${match[1]}`,
        number: match[1],
        title: match[2].trim(),
        content: part.trim(),
      });
    }
  }
  return sections;
}

export default function Learn() {
  const sections = useMemo(() => parseSections(content), []);
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => sections.filter(s => s.title.toLowerCase().includes(search.toLowerCase())),
    [sections, search],
  );

  const current = sections.find(s => s.id === activeId);

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* ── Sidebar ── */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-800 flex flex-col bg-gray-900/50">
        {/* Header + search */}
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={15} className="text-blue-400" />
            <span className="text-sm font-semibold text-gray-200">PostgreSQL Guide</span>
            <span className="ml-auto text-xs text-gray-600 tabular-nums">{sections.length} topics</span>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search topics…"
              className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        </div>

        {/* TOC list */}
        <nav className="flex-1 overflow-y-auto py-1.5">
          {filtered.map(section => {
            const isActive = activeId === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveId(section.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border-r-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border-r-2 border-transparent'
                }`}
              >
                <span className="text-[10px] font-black font-mono text-gray-600 w-5 flex-shrink-0 tabular-nums">
                  {section.number.padStart(2, '0')}
                </span>
                <span className="text-xs leading-snug flex-1">{section.title}</span>
                {isActive && <ChevronRight size={11} className="flex-shrink-0" />}
              </button>
            );
          })}

          {filtered.length === 0 && (
            <p className="px-4 py-8 text-xs text-gray-600 text-center">No matching topics.</p>
          )}
        </nav>

        {/* Footer attribution */}
        <div className="px-4 py-4 border-t border-gray-800 flex-shrink-0 bg-gray-900/60">
          <div className="flex items-center gap-2 mb-1.5">
            <img
              src="https://pbs.twimg.com/profile_images/1593295342448349185/4L1_NKDP_400x400.jpg"
              alt="Aaron Francis"
              className="w-7 h-7 rounded-full ring-1 ring-gray-700 flex-shrink-0"
              onError={(e) => {
                const img = e.currentTarget;
                // fallback 1: GitHub avatar
                if (!img.dataset.fb1) {
                  img.dataset.fb1 = '1';
                  img.src = 'https://github.com/aarondfrancis.png';
                } else {
                  // fallback 2: letter avatar
                  img.src = 'https://ui-avatars.com/api/?name=Aaron+Francis&background=1d4ed8&color=fff&size=64';
                }
              }}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-300 leading-tight">Aaron Francis</p>
              <p className="text-[10px] text-gray-600 leading-tight">@aarondfrancis</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed mt-1.5">
            Content based on{' '}
            <a
              href="https://masteringpostgres.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400/80 hover:text-blue-400 underline underline-offset-2"
            >
              Mastering Postgres
            </a>
            {' '}— widely regarded as one of the best PostgreSQL courses.{' '}
            <a
              href="https://twitter.com/aarondfrancis"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400/80 hover:text-blue-400 underline underline-offset-2"
            >
              Follow Aaron
            </a>{' '}for more.
          </p>
        </div>
      </aside>

      {/* ── Content area ── */}
      <main className="flex-1 overflow-y-auto bg-gray-950">
        {current ? (
          <div className="max-w-3xl mx-auto px-8 py-10">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Code blocks — syntax highlighted
                pre({ children }) {
                  return <>{children}</>;
                },
                code({ className, children }) {
                  const match = /language-(\w+)/.exec(className ?? '');
                  if (match) {
                    return (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          margin: '0.75rem 0',
                          border: '1px solid rgb(31 41 55)',
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    );
                  }
                  // Plain fenced code block (no language tag) — preserve whitespace
                  const raw = String(children);
                  if (raw.includes('\n')) {
                    return (
                      <pre className="learn-plain-code">
                        <code>{raw.replace(/\n$/, '')}</code>
                      </pre>
                    );
                  }
                  return (
                    <code className="bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded text-[0.72rem] font-mono">
                      {children}
                    </code>
                  );
                },

                // Tables
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-4 rounded-lg border border-gray-800">
                      <table className="w-full text-xs">{children}</table>
                    </div>
                  );
                },
                thead({ children }) {
                  return <thead className="bg-gray-800/70">{children}</thead>;
                },
                th({ children }) {
                  return (
                    <th className="px-4 py-2.5 text-left text-gray-300 font-semibold border-b border-gray-700 whitespace-nowrap">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="px-4 py-2.5 border-b border-gray-800/50 text-gray-400 text-xs">
                      {children}
                    </td>
                  );
                },

                // Blockquotes
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-2 border-blue-500/40 pl-4 my-4 bg-blue-500/5 py-2 pr-4 rounded-r-lg text-gray-400 italic text-sm">
                      {children}
                    </blockquote>
                  );
                },

                // Headings
                h2({ children }) {
                  return (
                    <h2 className="text-xl font-bold text-white mt-0 mb-5 pb-3 border-b border-gray-800">
                      {children}
                    </h2>
                  );
                },
                h3({ children }) {
                  return (
                    <h3 className="text-base font-semibold text-gray-200 mt-7 mb-3">{children}</h3>
                  );
                },
                h4({ children }) {
                  return (
                    <h4 className="text-sm font-semibold text-gray-300 mt-5 mb-2">{children}</h4>
                  );
                },

                // Body
                p({ children }) {
                  return <p className="text-gray-400 text-sm leading-relaxed mb-3">{children}</p>;
                },
                ul({ children }) {
                  return (
                    <ul className="list-disc list-outside ml-5 text-gray-400 text-sm space-y-1 mb-3">
                      {children}
                    </ul>
                  );
                },
                ol({ children }) {
                  return (
                    <ol className="list-decimal list-outside ml-5 text-gray-400 text-sm space-y-1 mb-3">
                      {children}
                    </ol>
                  );
                },
                strong({ children }) {
                  return <strong className="font-semibold text-gray-200">{children}</strong>;
                },
                a({ href, children }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                    >
                      {children}
                    </a>
                  );
                },
                hr() {
                  return <hr className="border-gray-800 my-6" />;
                },
              }}
            >
              {current.content}
            </ReactMarkdown>

            {/* Prev / Next navigation */}
            <div className="flex gap-3 mt-10 pt-6 border-t border-gray-800">
              {(() => {
                const idx = sections.findIndex(s => s.id === activeId);
                const prev = sections[idx - 1];
                const next = sections[idx + 1];
                return (
                  <>
                    {prev ? (
                      <button
                        onClick={() => setActiveId(prev.id)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        ← {prev.number}. {prev.title}
                      </button>
                    ) : (
                      <div />
                    )}
                    {next && (
                      <button
                        onClick={() => setActiveId(next.id)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs text-gray-400 hover:text-gray-200 transition-colors ml-auto"
                      >
                        {next.number}. {next.title} →
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Select a topic from the sidebar.
          </div>
        )}
      </main>
    </div>
  );
}
