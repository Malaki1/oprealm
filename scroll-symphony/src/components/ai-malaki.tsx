"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, Mail, Mic, Phone, ShieldCheck, Square } from "lucide-react";
import { z } from "zod";
import { aiMalakiWorkflow } from "@/data/workflows";
import { WorkflowNode } from "./mockups";

const callbackSchema = z.object({
  name: z.string().min(2, "Enter your name."),
  email: z.string().email("Enter a valid email."),
  phone: z.string().min(7, "Enter a valid phone number."),
  projectInterest: z.string().min(3, "Add a short project interest.")
});

type CallbackFormValues = z.infer<typeof callbackSchema>;

const portfolioPrompts = [
  {
    prompt: "What has Malaki built?",
    response:
      "Malaki has built Solcraft, Skillfusion.ai, AI Agent Automation systems, OPRealm, and Site Potential across AI products, automation, Web3, creative tools, and property technology."
  },
  {
    prompt: "What are his strongest achievements?",
    response:
      "His strongest achievements include more than $300K USD across Solcraft NFT launches, $150K+ USD in the first 12 hours, 5,000 users for Skillfusion.ai, and final funding rounds with Founders University."
  },
  {
    prompt: "What AI products has he created?",
    response:
      "Malaki created OPRealm, an AI kids creation platform, built AI-powered websites and agent workflows, co-founded Skillfusion.ai, and built Site Potential's AI-assisted property report engine."
  },
  {
    prompt: "How could Malaki help my business?",
    response:
      "Malaki can help structure an AI product idea, design automation workflows, build a conversion-focused web app, create report or audit funnels, and turn manual processes into connected digital systems."
  }
];

export function AudioWaveform({ active = true }: { active?: boolean }) {
  return (
    <div className="flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-black/20 px-4" aria-hidden="true">
      {Array.from({ length: 22 }).map((_, index) => (
        <motion.span
          key={index}
          className="w-1 rounded-full bg-gradient-to-t from-violet to-cyan"
          animate={active ? { height: [8, 26 + (index % 5) * 4, 10] } : { height: 8 }}
          transition={{ duration: 0.7 + (index % 4) * 0.1, repeat: active ? Infinity : 0, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export function ConsentNotice() {
  return (
    <div className="rounded-2xl border border-auric/25 bg-auric/10 p-4 text-sm leading-relaxed text-white/75">
      <div className="mb-2 flex items-center gap-2 font-bold text-auric">
        <ShieldCheck size={18} /> AI disclosure and consent
      </div>
      AI Malaki is an automated voice agent trained on public-facing information about Malaki&apos;s work. By starting a call, you agree to share the information needed to respond, qualify your enquiry, and schedule a meeting.
    </div>
  );
}

export function TranscriptPanel({ activeResponse = portfolioPrompts[0].response }: { activeResponse?: string }) {
  const messages = [
    ["AI Malaki", "Ask me about Malaki's projects, proof points, AI products, or how he can help a business."],
    ["Visitor", "What should I know first?"],
    ["AI Malaki", activeResponse]
  ];

  return (
    <div className="rounded-3xl border border-white/15 bg-white/[0.045] p-5">
      <h3 className="mb-4 text-xl font-black">Live conversation preview</h3>
      <div className="space-y-3">
        {messages.map(([speaker, message], index) => (
          <div key={index} className={`rounded-2xl p-4 text-sm ${speaker === "AI Malaki" ? "bg-cyan/10" : "bg-white/[0.06]"}`}>
            <span className="font-bold text-white">{speaker}: </span>
            <span className="text-silver">{message}</span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <AudioWaveform />
      </div>
    </div>
  );
}

export function SuggestedPromptChips({
  activePrompt,
  onSelect
}: {
  activePrompt?: string;
  onSelect?: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {portfolioPrompts.map(({ prompt }) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect?.(prompt)}
          className={`rounded-full border px-3 py-2 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan ${
            activePrompt === prompt
              ? "border-cyan/45 bg-cyan/15 text-white shadow-glow"
              : "border-white/10 bg-white/[0.06] text-white/75 hover:border-cyan/40 hover:text-white"
          }`}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}

export function VoiceCallButton() {
  const [status, setStatus] = useState<"idle" | "demo" | "ended">("idle");
  const hasAgent = Boolean(process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID);

  return (
    <div>
      <button
        type="button"
        onClick={() => setStatus(status === "demo" ? "ended" : "demo")}
        className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-gradient-to-r from-cyan/25 to-violet/25 px-5 py-3 text-sm font-black text-white shadow-glow transition hover:from-cyan/35 hover:to-violet/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan"
      >
        {status === "demo" ? <Square size={16} /> : <Mic size={17} />}
        {status === "demo" ? "End Demo Call" : "Talk To AI Malaki"}
      </button>
      <div className="mt-2 text-xs text-white/45">
        {hasAgent ? "ElevenLabs agent ID detected. Wire the signed session endpoint before production calls." : "Demo mode active until ElevenLabs credentials are configured."}
      </div>
    </div>
  );
}

export function BookingStatusCard() {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/[0.045] p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-cyan/15 text-cyan">
          <CalendarCheck />
        </span>
        <div>
          <div className="font-black">Booking automation ready</div>
          <div className="text-sm text-silver">Calendly or Google Calendar can be swapped behind the same payload.</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/65">
        <Mail size={17} className="text-auric" />
        Follow-up emails route through n8n webhooks.
      </div>
    </div>
  );
}

export function CallbackForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<CallbackFormValues>({ resolver: zodResolver(callbackSchema) });

  async function onSubmit(values: CallbackFormValues) {
    await fetch("/api/callback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, consentTimestamp: new Date().toISOString(), sourcePage: "scroll-symphony" })
    }).catch(() => undefined);
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-3xl border border-white/15 bg-white/[0.045] p-5">
      <div className="mb-4 flex items-center gap-2 text-lg font-black">
        <Phone className="text-cyan" /> Request callback
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name" error={errors.name?.message}><input {...register("name")} className="field" /></Field>
        <Field label="Email" error={errors.email?.message}><input {...register("email")} className="field" /></Field>
        <Field label="Phone" error={errors.phone?.message}><input {...register("phone")} className="field" /></Field>
        <Field label="Project interest" error={errors.projectInterest?.message}><input {...register("projectInterest")} className="field" /></Field>
      </div>
      <button
        disabled={isSubmitting}
        className="mt-4 rounded-full border border-cyan/30 bg-cyan/15 px-5 py-3 text-sm font-black transition hover:bg-cyan/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan disabled:opacity-60"
      >
        {submitted ? "Callback request captured" : "Send Callback Request"}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold text-white/75">
      {label}
      <span className="mt-2 block [&_.field]:w-full [&_.field]:rounded-2xl [&_.field]:border [&_.field]:border-white/10 [&_.field]:bg-black/25 [&_.field]:px-4 [&_.field]:py-3 [&_.field]:text-white [&_.field]:outline-none [&_.field]:transition [&_.field]:focus:border-cyan/50">
        {children}
      </span>
      {error ? <span className="mt-1 block text-xs text-auric">{error}</span> : null}
    </label>
  );
}

export function WorkflowVisualizer() {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/[0.045] p-5">
      <h3 className="mb-4 text-xl font-black">Automation workflow</h3>
      <div className="grid gap-3 md:grid-cols-4">
        {aiMalakiWorkflow.map((step, index) => (
          <WorkflowNode key={step.label} {...step} active={index < 5} />
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-auric/10 px-4 py-3 text-xs font-bold text-auric">
        Disclosure: visitors are speaking with an AI version of Malaki, not the live human.
      </div>
    </div>
  );
}

export function AIMalakiPanel() {
  const [activePrompt, setActivePrompt] = useState(portfolioPrompts[0].prompt);
  const activeResponse =
    portfolioPrompts.find((item) => item.prompt === activePrompt)?.response || portfolioPrompts[0].response;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.68fr_1fr]">
      <div className="rounded-[32px] border border-white/15 bg-[#07101d]/80 p-6 shadow-glow">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-cyan/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/75">
          <span className="size-2 rounded-full bg-cyan" /> AI Malaki available
        </div>
        <h3 className="font-display text-5xl font-black leading-tight">
          Meet <span className="bg-gradient-to-r from-cyan to-violet bg-clip-text text-transparent">AI</span>
          <br />
          Malaki
        </h3>
        <p className="mt-5 max-w-sm text-silver">An AI voice agent trained to discuss projects, capture details, book time, and start follow-up workflows.</p>
        <div className="my-10 grid place-items-center">
          <div className="relative grid size-44 place-items-center rounded-full bg-cyan/10">
            <span className="absolute inset-5 rounded-full border border-cyan/20" />
            <span className="absolute inset-10 rounded-full border border-dashed border-cyan/20" />
            <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan to-violet shadow-violet">
              <Mic />
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <VoiceCallButton />
          <a href="#contact" className="rounded-full border border-auric/25 bg-auric/10 px-5 py-3 text-sm font-black text-white transition hover:bg-auric/20">
            Request Callback
          </a>
        </div>
        <div className="mt-6">
          <SuggestedPromptChips activePrompt={activePrompt} onSelect={setActivePrompt} />
        </div>
      </div>
      <div className="space-y-6">
        <TranscriptPanel activeResponse={activeResponse} />
        <WorkflowVisualizer />
      </div>
    </div>
  );
}

export function AIMalakiModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-malaki-dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[92svh] w-full max-w-4xl overflow-auto rounded-[32px] border border-white/15 bg-[#07101d] p-6 shadow-glow"
            initial={{ scale: 0.94, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 20 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan">Meet AI Malaki</div>
                <h2 id="ai-malaki-dialog" className="mt-2 font-display text-3xl font-black">Talk to an AI version of me.</h2>
              </div>
              <button onClick={onClose} className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold">Close</button>
            </div>
            <ConsentNotice />
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <TranscriptPanel />
              <BookingStatusCard />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
