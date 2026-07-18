"use client";

import { JobsBubbleRace } from "@/components/dashboard/JobsBubbleRace";

export default function BubbleTestPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-ink">Hành trình việc làm 2000–2025</h3>
        <p className="mt-0.5 text-xs text-ink-soft">Preview cô lập để kiểm thử</p>
        <div className="mt-4">
          <JobsBubbleRace />
        </div>
      </div>
    </main>
  );
}
