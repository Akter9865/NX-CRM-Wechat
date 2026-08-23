import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DOC_PAGES, DocPage } from '@/lib/docs/docs-content';
import {
  BookOpen,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Code2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return DOC_PAGES.map((doc) => ({
    slug: doc.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const doc = DOC_PAGES.find((d) => d.slug === slug);
  if (!doc) return { title: 'Guide Not Found' };

  return {
    title: `${doc.title} — NX CRM Documentation`,
    description: doc.tagline,
  };
}

export default async function DocDetailPage({ params }: Props) {
  const { slug } = await params;
  const doc = DOC_PAGES.find((d) => d.slug === slug);

  if (!doc) {
    notFound();
  }

  const currentIndex = DOC_PAGES.findIndex((d) => d.slug === slug);
  const prevDoc = currentIndex > 0 ? DOC_PAGES[currentIndex - 1] : null;
  const nextDoc = currentIndex < DOC_PAGES.length - 1 ? DOC_PAGES[currentIndex + 1] : null;

  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">
          {/* Sidebar Nav */}
          <aside className="lg:col-span-1 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 space-y-3 sticky top-24 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-2">
                All Documentation Guides
              </div>
              <nav className="space-y-1">
                {DOC_PAGES.map((d) => {
                  const isActive = d.slug === slug;
                  return (
                    <Link
                      key={d.slug}
                      href={`/docs/${d.slug}`}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 border border-blue-200 text-blue-800 font-bold shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span>{d.title}</span>
                      {isActive && <ChevronRight className="size-3.5 text-blue-600" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Article Content */}
          <article className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-md space-y-8">
            {/* Header */}
            <div className="space-y-3 pb-6 border-b border-slate-100">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                {doc.category}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {doc.title}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">{doc.tagline}</p>
            </div>

            {/* Overview */}
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 p-5 rounded-2xl">
              {doc.content.overview}
            </div>

            {/* Body Sections */}
            <div className="space-y-8">
              {doc.content.sections.map((section, idx) => (
                <div key={idx} className="space-y-3">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    {section.heading}
                  </h2>
                  <div className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {section.body.map((p, pIdx) => (
                      <p key={pIdx}>{p}</p>
                    ))}
                  </div>

                  {section.codeSnippet && (
                    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
                      <pre>
                        <code>{section.codeSnippet}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Pagination */}
            <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              {prevDoc ? (
                <Link href={`/docs/${prevDoc.slug}`} className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto h-11 px-5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-2">
                    <ArrowLeft className="size-3.5" />
                    <span>{prevDoc.title}</span>
                  </Button>
                </Link>
              ) : (
                <div />
              )}

              {nextDoc ? (
                <Link href={`/docs/${nextDoc.slug}`} className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md">
                    <span>{nextDoc.title}</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              ) : (
                <div />
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
