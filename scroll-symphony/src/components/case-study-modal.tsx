"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { caseStudies } from "@/data/case-studies";

export function CaseStudyModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const study = id ? caseStudies.find((item) => item.id === id) : null;

  return (
    <AnimatePresence>
      {study ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-study-title"
          onClick={onClose}
        >
          <motion.div
            className="relative max-h-[92svh] w-full max-w-5xl overflow-auto rounded-[32px] border border-white/15 bg-[#07101d] p-6 shadow-violet md:p-8"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-5 top-5 grid size-10 place-items-center rounded-full border border-white/15 bg-white/[0.05] transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan"
              aria-label="Close case study"
            >
              <X size={18} />
            </button>
            <div className="max-w-3xl">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan">Case study</div>
              <h2 id="case-study-title" className="mt-3 font-display text-4xl font-black md:text-6xl">
                {study.title}
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {study.metrics.map((metric) => (
                <div key={metric} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm font-bold text-white/80">
                  {metric}
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                ["Problem", study.problem],
                ["Product built", study.productBuilt],
                ["Role", study.role],
                ["Strategy", study.strategy],
                ["Result", study.result],
                ["What it proves", study.proves]
              ].map(([label, value]) => (
                <section key={label} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-cyan">{label}</h3>
                  <p className="mt-3 leading-relaxed text-silver">{value}</p>
                </section>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
