"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, BarChart3, Bot, CalendarCheck, Check, Mail, Mic } from "lucide-react";
import { ProjectIcon } from "./icons";
import type { Project } from "@/data/projects";

export function FloatingPanel({
  children,
  className = "",
  delay = 0
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.35 }}
      transition={{ duration: 0.7, delay }}
      className={`glass rounded-[28px] ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function HologramCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      whileHover={{ y: -6, rotateX: 3, rotateY: -3 }}
      className={`relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.055] p-5 shadow-glow ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(66,245,215,0.16),transparent_38%)]" aria-hidden="true" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

export function MetricCard({ label, value, detail, tone = "#42f5d7" }: { label: string; value: string; detail: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-black/20 p-4">
      <div className="text-2xl font-black text-white" style={{ textShadow: `0 0 24px ${tone}` }}>
        {value}
      </div>
      <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-white/60">{label}</div>
      <p className="mt-3 text-sm leading-relaxed text-silver">{detail}</p>
    </div>
  );
}

export function BrowserMockup({ title = "AI product dashboard", children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/15 bg-[#070b14] shadow-violet" role="img" aria-label={title}>
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
        <span className="size-2 rounded-full bg-red-400/70" />
        <span className="size-2 rounded-full bg-auric/80" />
        <span className="size-2 rounded-full bg-cyan/80" />
        <span className="ml-4 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/55">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function PhoneMockup() {
  return (
    <div className="mx-auto w-full max-w-[260px] rounded-[34px] border border-white/20 bg-black p-3 shadow-glow" role="img" aria-label="AI Malaki phone call interface">
      <div className="rounded-[26px] border border-white/10 bg-gradient-to-b from-[#101827] to-[#080b13] p-5">
        <div className="mx-auto mb-5 h-1 w-16 rounded-full bg-white/20" />
        <div className="grid place-items-center gap-4 py-8">
          <div className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-cyan to-violet text-2xl font-black">MA</div>
          <div className="text-center">
            <div className="font-bold">AI Malaki</div>
            <div className="text-xs text-cyan">Voice agent active</div>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 16 }).map((_, i) => (
              <span key={i} className="w-1 rounded-full bg-cyan" style={{ height: 12 + (i % 5) * 7 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardMockup({ project }: { project: Project }) {
  return (
    <BrowserMockup title={`${project.name} command system`}>
      <div className="grid gap-4 md:grid-cols-[1fr_.8fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-4 flex items-center gap-2">
            {project.icons.slice(0, 3).map((Icon, index) => (
              <ProjectIcon key={index} icon={Icon} label={project.name} tone={project.colorTheme.primary} />
            ))}
          </div>
          <h3 className="font-display text-2xl font-black">{project.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-silver">{project.shortDescription}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {project.metrics.slice(0, 2).map((metric) => (
              <MetricCard key={metric.label} {...metric} tone={project.colorTheme.primary} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Live system</span>
            <ArrowUpRight size={18} className="text-cyan" />
          </div>
          <div className="space-y-3">
            {[72, 46, 88, 60].map((width, index) => (
              <div key={index} className="rounded-xl bg-white/[0.04] p-3">
                <div className="h-2 rounded-full bg-white/10">
                  <motion.div
                    className="h-2 rounded-full"
                    style={{ background: project.colorTheme.primary, width: `${width}%` }}
                    initial={{ width: "8%" }}
                    whileInView={{ width: `${width}%` }}
                    viewport={{ once: false }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-br from-cyan/10 to-violet/10 p-4">
            <BarChart3 className="mb-4 text-cyan" />
            <svg viewBox="0 0 260 80" className="h-20 w-full" aria-hidden="true">
              <path d="M4 62L42 54L76 40L114 46L154 20L196 30L254 10" fill="none" stroke={project.colorTheme.primary} strokeWidth="4" />
              <path d="M4 62L42 54L76 40L114 46L154 20L196 30L254 10V80H4Z" fill={project.colorTheme.primary} opacity=".16" />
            </svg>
          </div>
        </div>
      </div>
    </BrowserMockup>
  );
}

export function ProjectCard3D({ project, onOpen }: { project: Project; onOpen: (id: string) => void }) {
  return (
    <motion.article
      whileHover={{ y: -8, rotateX: 2, rotateY: -2 }}
      className="glass group relative overflow-hidden rounded-3xl p-5"
    >
      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100" style={{ background: `radial-gradient(circle at 80% 0%, ${project.colorTheme.primary}33, transparent 38%)` }} />
      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex gap-2">
            {project.icons.slice(0, 3).map((Icon, index) => (
              <ProjectIcon key={index} icon={Icon} label={project.name} tone={project.colorTheme.primary} />
            ))}
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">{project.category}</span>
        </div>
        <h3 className="font-display text-2xl font-black">{project.name}</h3>
        <p className="mt-2 min-h-16 text-sm leading-relaxed text-silver">{project.headline}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {project.metrics.slice(0, 2).map((metric) => (
            <div key={metric.label} className="rounded-2xl bg-black/20 p-3">
              <div className="text-xl font-black">{metric.value}</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">{metric.label}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => onOpen(project.id)}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan"
        >
          View Case Study <ArrowUpRight size={16} />
        </button>
      </div>
    </motion.article>
  );
}

export function WorkflowNode({ icon: Icon, label, detail, active = false }: { icon: typeof Bot; label: string; detail: string; active?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 transition ${active ? "border-cyan/55 bg-cyan/10 shadow-glow" : "border-white/12 bg-white/[0.045]"}`}>
      <Icon className={active ? "text-cyan" : "text-white/55"} size={21} />
      <div className="mt-3 text-sm font-bold">{label}</div>
      <div className="mt-1 text-xs leading-relaxed text-silver">{detail}</div>
    </div>
  );
}

export function AIMiniFlow() {
  const items = [
    { icon: Mic, label: "Voice Call", detail: "ElevenLabs + Twilio" },
    { icon: Check, label: "Lead Qualified", detail: "Project fit captured" },
    { icon: CalendarCheck, label: "Meeting Booked", detail: "Calendar confirmed" },
    { icon: Mail, label: "Email Sent", detail: "n8n follow-up" }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <item.icon className="text-cyan" size={20} />
          <div className="mt-4 text-sm font-bold">{item.label}</div>
          <div className="mt-1 text-xs text-white/45">{item.detail}</div>
        </div>
      ))}
    </div>
  );
}
