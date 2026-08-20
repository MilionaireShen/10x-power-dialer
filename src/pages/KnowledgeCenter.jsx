import { useMemo, useState } from "react";
import {
  Search,
  Rocket,
  Phone,
  ListChecks,
  Tag,
  MessageSquare,
  BarChart3,
  Headphones,
  Trophy,
  FolderKanban,
  Building2,
  Scale,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { KNOWLEDGE_CATEGORIES } from "../data/mockData";

const ICON_MAP = {
  "getting-started": Rocket,
  "dialing-modes": Phone,
  "lead-health": ListChecks,
  dispositions: Tag,
  sms: MessageSquare,
  reports: BarChart3,
  monitoring: Headphones,
  leaderboard: Trophy,
  campaigns: FolderKanban,
  "multi-tenant": Building2,
  compliance: Scale,
};

function articlesFor(category) {
  return Array.from({ length: category.count }).map((_, i) => ({
    id: `${category.key}-${i + 1}`,
    title: `${category.title} — Part ${i + 1}`,
    minutes: 2 + ((i * 3) % 6),
  }));
}

const ARTICLE_BODY = [
  "10X Power Dialer is designed so any agent can be productive within minutes — no lengthy onboarding required.",
  "Every screen follows the same visual language: a single accent color, clear status indicators, and legible controls.",
  "When in doubt, the color of a status pill always tells you what's happening — blue means ready, green means on a call, and red tones mean attention is needed.",
];

export default function KnowledgeCenter() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(null);
  const [article, setArticle] = useState(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return KNOWLEDGE_CATEGORIES;
    const q = search.toLowerCase();
    return KNOWLEDGE_CATEGORIES.filter(
      (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div>
      <PageHeader title="Knowledge Center" subtitle="Answers for every screen in 10X Power Dialer" />

      <div className="p-8 space-y-6">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCategory(null);
              setArticle(null);
            }}
            placeholder="Search for help…"
            className="input-field pl-11 py-3 text-base"
          />
        </div>

        <Breadcrumbs
          category={category}
          article={article}
          onHome={() => {
            setCategory(null);
            setArticle(null);
          }}
          onCategory={() => setArticle(null)}
        />

        {!category && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const Icon = ICON_MAP[c.key];
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c)}
                  className="card text-left transition-colors duration-150 hover:border-[var(--color-accent)]/40"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent-tint)]">
                    <Icon size={18} className="text-[var(--color-accent)]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{c.title}</h3>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{c.description}</p>
                  <p className="mt-3 text-[11px] font-medium text-[var(--color-accent)]">{c.count} articles</p>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-full py-10 text-center text-[var(--color-text-tertiary)]">No results for &ldquo;{search}&rdquo;.</p>
            )}
          </div>
        )}

        {category && !article && (
          <div className="card divide-y divide-[var(--color-border)] p-0">
            {articlesFor(category).map((a) => (
              <button
                key={a.id}
                onClick={() => setArticle(a)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[var(--color-bg)]"
              >
                <span className="text-sm text-[var(--color-text-primary)]">{a.title}</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{a.minutes} min read</span>
              </button>
            ))}
          </div>
        )}

        {article && (
          <article className="card max-w-2xl">
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{article.title}</h1>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{article.minutes} min read · {category.title}</p>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {ARTICLE_BODY.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <h2 className="pt-2 text-base font-semibold text-[var(--color-text-primary)]">Key takeaways</h2>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>Status colors update automatically — no manual refresh needed.</li>
                <li>Wrap-up time is fully configurable per campaign by an admin.</li>
                <li>Every action that affects your team is logged for reporting.</li>
              </ul>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

function Breadcrumbs({ category, article, onHome, onCategory }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
      <button onClick={onHome} className="hover:text-[var(--color-text-primary)] transition-colors">
        Knowledge Center
      </button>
      {category && (
        <>
          <span>/</span>
          <button onClick={onCategory} className="hover:text-[var(--color-text-primary)] transition-colors">
            {category.title}
          </button>
        </>
      )}
      {article && (
        <>
          <span>/</span>
          <span className="text-[var(--color-text-secondary)]">{article.title}</span>
        </>
      )}
    </div>
  );
}
