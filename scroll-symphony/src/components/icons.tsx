"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export function IconBadge({
  icon: Icon,
  label,
  tone = "#35a7ff",
  className = ""
}: {
  icon: LucideIcon;
  label: string;
  tone?: string;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.03 }}
      className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/85 shadow-glow ${className}`}
      aria-label={label}
    >
      <span
        className="grid size-6 place-items-center rounded-full"
        style={{ background: `${tone}22`, color: tone, boxShadow: `0 0 22px ${tone}55` }}
      >
        <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
      </span>
      {label}
    </motion.div>
  );
}

export function ProjectIcon({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: string }) {
  return (
    <span
      className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/[0.07]"
      style={{ color: tone, boxShadow: `inset 0 0 18px ${tone}22` }}
      title={label}
      aria-label={label}
    >
      <Icon size={18} aria-hidden="true" />
    </span>
  );
}
