import { useEffect, useMemo, useState } from "react";
import { Search, BookOpen } from "lucide-react";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../lib/ToastContext";
import api from "../services/api";

// Help articles come from the knowledge_base table. The screen previously
// showed a fixed set of categories with invented article counts and served the
// same three paragraphs whichever article was opened — so every article looked
// written when none were.

function categoryLabel(key) {
  return String(key || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function readingMinutes(content) {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export default function KnowledgeCenter() {
  const { notify } = useToast();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(null);
  const [article, setArticle] = useState(null);

  useEffect(() => {
    api.get("/admin/knowledge")
      .then((r) => setArticles(r.data?.data?.articles || []))
      .catch((err) => {
        const message = err?.response?.data?.message || "Could not load help articles.";
        setError(message);
        notify(message, "error");
      })
      .finally(() => setLoading(false));
  }, [notify]);

  // Categories are whatever the articles are filed under, so an empty library
  // shows no categories rather than a wall of empty tiles.
  const categories = useMemo(() => {
    const byKey = {};
    for (const a of articles) {
      byKey[a.category] = byKey[a.category] || { key: a.category, count: 0 };
      byKey[a.category].count += 1;
    }
    return Object.values(byKey).sort((a, b) => a.key.localeCompare(b.key));
  }, [articles]);

  const matches = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return articles.filter(
      (a) => a.title.toLowerCase().includes(q) || String(a.content || "").toLowerCase().includes(q),
    );
  }, [search, articles]);

  const inCategory = category ? articles.filter((a) => a.category === category.key) : [];

  return (
    <div>
      <PageHeader title="Knowledge Center" subtitle="Answers for every screen in 10X Power Dialer" />

      <div className="space-y-6 p-8">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCategory(null); setArticle(null); }}
            placeholder="Search for help…"
            className="input-field py-3 pl-11 text-base"
          />
        </div>

        <Breadcrumbs
          category={category}
          article={article}
          onHome={() => { setCategory(null); setArticle(null); }}
          onCategory={() => setArticle(null)}
        />

        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading…</p>
        ) : error ? (
          <EmptyState icon={BookOpen} title="Could not load help articles" description={error} />
        ) : articles.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No help articles yet"
            description="Articles published to the knowledge base appear here."
          />
        ) : matches ? (
          matches.length === 0 ? (
            <p className="py-10 text-center text-[var(--color-text-tertiary)]">No results for &ldquo;{search}&rdquo;.</p>
          ) : (
            <div className="card divide-y divide-[var(--color-border)] p-0">
              {matches.map((a) => (
                <ArticleRow key={a.id} article={a} onOpen={() => {
                  setCategory({ key: a.category, title: categoryLabel(a.category) });
                  setArticle(a);
                  setSearch("");
                }} />
              ))}
            </div>
          )
        ) : article ? (
          <article className="card max-w-2xl">
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{article.title}</h1>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              {readingMinutes(article.content)} min read · {categoryLabel(article.category)}
            </p>
            <div className="mt-5 space-y-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {article.content}
            </div>
          </article>
        ) : category ? (
          <div className="card divide-y divide-[var(--color-border)] p-0">
            {inCategory.map((a) => (
              <ArticleRow key={a.id} article={a} onOpen={() => setArticle(a)} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory({ key: c.key, title: categoryLabel(c.key) })}
                className="card text-left transition-colors duration-150 hover:border-[var(--color-accent)]/40"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent-tint)]">
                  <BookOpen size={18} className="text-[var(--color-accent)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{categoryLabel(c.key)}</h3>
                <p className="mt-3 text-[11px] font-medium text-[var(--color-accent)]">
                  {c.count} article{c.count === 1 ? "" : "s"}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleRow({ article, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[var(--color-bg)]"
    >
      <span className="text-sm text-[var(--color-text-primary)]">{article.title}</span>
      <span className="text-xs text-[var(--color-text-tertiary)]">{readingMinutes(article.content)} min read</span>
    </button>
  );
}

function Breadcrumbs({ category, article, onHome, onCategory }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
      <button onClick={onHome} className="transition-colors hover:text-[var(--color-text-primary)]">
        Knowledge Center
      </button>
      {category && (
        <>
          <span>/</span>
          <button onClick={onCategory} className="transition-colors hover:text-[var(--color-text-primary)]">
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
