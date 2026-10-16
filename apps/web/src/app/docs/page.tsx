// apps/web/src/app/docs/page.tsx
'use client';

import React from 'react';
import { SiteHeader } from '../../components/site/SiteHeader';
import { SiteFooter } from '../../components/site/SiteFooter';
import { PageHeader } from '../../components/ui';

export default function DocsPage() {
  const docs = [
    {
      id: '01-BRS',
      title: '01 · Business Requirements Specification',
      desc: 'Problem definition, Equb mechanics, user roles, business rules (BR-01 to BR-20), and economic invariants.',
    },
    {
      id: '02-SRS',
      title: '02 · System Requirements Specification',
      desc: 'Functional requirements (FR-01 to FR-28), safety invariants, non-functional requirements, and acceptance criteria.',
    },
    {
      id: '03-Threat-Model',
      title: '03 · Threat Model & Attack Scenarios',
      desc: 'Formal threat analysis (T1 to T32), STRIDE categorization, prompt injection defenses, and test vectors.',
    },
    {
      id: '04-Evidence-Spec',
      title: '04 · Evidence Specification',
      desc: 'Claims C1 through C14 and exact verification scripts to audit each claim against testnet records.',
    },
    {
      id: '05-PDR',
      title: '05 · Preliminary Design Review',
      desc: 'System architecture, process separation (agent, executor, watcher), state machines, and fail-closed design.',
    },
    {
      id: '06-TDD',
      title: '06 · Technical Design Document',
      desc: 'PostgreSQL schema, database transaction boundaries, Arc Testnet contract interfaces, and REST API routes.',
    },
    {
      id: '07-Frontend-Prompt',
      title: '07 · Frontend Design Guidelines',
      desc: 'Visual direction, Paper & Ink tokens, zero banned patterns, typography, and accessibility criteria.',
    },
    {
      id: '08-IVM',
      title: '08 · Independent Verification Matrix',
      desc: 'Mapping of requirements to test fixtures, CI/CD gates, fuzzing results, and edge cases.',
    },
    {
      id: '09-Schedule',
      title: '09 · Project Schedule & Work Breakdown',
      desc: 'Milestones, work breakdown structure (Tasks A through F), and hackathon delivery timeline.',
    },
  ];

  const [selectedDoc, setSelectedDoc] = React.useState(docs[0]);

  return (
    <div className="min-h-screen bg-paper-0 text-ink-900 font-sans selection:bg-spruce-100 selection:text-spruce-700">
      <SiteHeader />

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-8">
        <PageHeader
          monoLabel="Project Memory & Formal Specifications"
          title="Project documents."
          statusSentence="The nine source-of-truth documents that define every requirement, threat, and invariant of EqubFlow."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Table of Contents */}
          <aside className="lg:col-span-4 bg-paper-1 border border-line divide-y divide-line select-none">
            <div className="p-3 bg-paper-2 font-mono text-meta uppercase font-semibold text-ink-500">
              Table of Contents
            </div>
            {docs.map((doc) => {
              const isSelected = selectedDoc.id === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full text-left p-3.5 transition-colors font-sans text-secondary ${
                    isSelected
                      ? 'bg-paper-0 font-semibold text-ink-900 border-l-2 border-ink-900'
                      : 'text-ink-700 hover:bg-paper-2 hover:text-ink-900'
                  }`}
                >
                  <div className="font-mono text-meta text-ink-500 mb-0.5">
                    {doc.id}
                  </div>
                  <div>{doc.title.split(' · ')[1]}</div>
                </button>
              );
            })}
          </aside>

          {/* Right Document Viewer */}
          <article className="lg:col-span-8 bg-paper-1 border border-line p-6 space-y-6 font-sans">
            <div className="border-b border-line pb-4">
              <span className="font-mono text-meta text-spruce-700 font-semibold uppercase">
                {selectedDoc.id}.md
              </span>
              <h2 className="font-display text-h3 font-medium text-ink-900 mt-1">
                {selectedDoc.title}
              </h2>
              <p className="text-secondary text-ink-700 mt-2 leading-relaxed">
                {selectedDoc.desc}
              </p>
            </div>

            <div className="p-4 bg-paper-0 border border-line font-mono text-secondary text-ink-700 space-y-2">
              <div className="font-sans font-semibold text-ink-900">
                Source repository path:
              </div>
              <div className="text-meta text-ink-500">
                docs/{selectedDoc.id}.md
              </div>
              <div className="pt-2 text-meta font-sans">
                To inspect the unedited specification text, view the markdown file
                directly in the repository root or clone the repository.
              </div>
            </div>

            <div className="pt-2">
              <a
                href={`https://github.com/sadik-tofik/equb-flow/blob/main/docs/${selectedDoc.id}.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-spruce-700 underline font-medium text-secondary"
              >
                Open {selectedDoc.id}.md on GitHub &gt;&gt;
              </a>
            </div>
          </article>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
