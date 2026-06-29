"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Bot,
  BrainCircuit,
  Briefcase,
  Check,
  Code2,
  Cpu,
  Funnel,
  Mail,
  Menu,
  MessageCircle,
  MousePointer2,
  Network,
  Rocket,
  Sparkles,
  Target,
  Workflow,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { projects } from "@/data/projects";
import { timeline } from "@/data/timeline";
import { caseStudies } from "@/data/case-studies";
import {
  coreCapabilities,
  proofStats,
  rotatingWords,
  ventureBadges,
  whatIBuild,
  workOffers
} from "@/data/capabilities";
import { AIMalakiModal, AIMalakiPanel } from "./ai-malaki";
import { CaseStudyModal } from "./case-study-modal";
import { IconBadge } from "./icons";
import { TimelineMilestone } from "./timeline-milestone";
import {
  AIMiniFlow,
  BrowserMockup,
  DashboardMockup,
  FloatingPanel,
  MetricCard,
  PhoneMockup,
  WorkflowNode
} from "./mockups";
import {
  AnimatedGrid,
  DataStream,
  GradientOrb,
  HeroNeuralGrid,
  LightBeam,
  MapGridVisual,
  NeuralLines,
  NoiseOverlay,
  ParticleField,
  PortalVisual
} from "./visuals";

gsap.registerPlugin(ScrollTrigger);

const buildIcons: LucideIcon[] = [BrainCircuit, Workflow, Code2, Funnel, Rocket];
const capabilityIcons: LucideIcon[] = [BrainCircuit, Network, Cpu, Target];
const offerIcons: LucideIcon[] = [BrainCircuit, Workflow, Briefcase];

export function ScrollSymphony() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [caseStudyId, setCaseStudyId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const updateNativeProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      setScrollProgress(Math.max(0, Math.min(1, progress)));
      setNavScrolled(window.scrollY > 24);
    };

    updateNativeProgress();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      window.addEventListener("scroll", updateNativeProgress, { passive: true });
      return () => window.removeEventListener("scroll", updateNativeProgress);
    }

    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };

    const handleLenisScroll = (event: { progress: number; scroll: number }) => {
      setScrollProgress(Math.max(0, Math.min(1, event.progress)));
      setNavScrolled(event.scroll > 24);
      ScrollTrigger.update();
    };

    gsap.ticker.add(tick);
    lenis.on("scroll", handleLenisScroll);
    gsap.ticker.lagSmoothing(0);

    const context = gsap.context(() => {
      const scenes = gsap.utils.toArray<HTMLElement>(".js-pin");
      scenes.forEach((scene) => {
        const targets = scene.querySelectorAll(".js-scrub");
        if (!targets.length) return;

        if (scene.classList.contains("hero-scene")) {
          gsap.fromTo(
            targets,
            { y: 36, opacity: 0, scale: 0.98 },
            { y: 0, opacity: 1, scale: 1, stagger: 0.08, duration: 0.9, ease: "power3.out" }
          );
          ScrollTrigger.create({
            trigger: scene,
            start: "top top",
            end: window.innerWidth < 768 ? "+=120%" : "+=190%",
            pin: window.innerWidth >= 768,
            anticipatePin: 1
          });
          return;
        }

        gsap.fromTo(
          targets,
          { y: 70, opacity: 0, scale: 0.96 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.08,
            ease: "none",
            scrollTrigger: {
              trigger: scene,
              start: "top top",
              end: window.innerWidth < 768 ? "+=120%" : "+=220%",
              scrub: true,
              pin: window.innerWidth >= 768
            }
          }
        );
      });

      gsap.utils.toArray<HTMLElement>(".js-reveal").forEach((item) => {
        gsap.fromTo(
          item,
          { opacity: 0, y: 42 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: { trigger: item, start: "top 82%", toggleActions: "play none none reverse" }
          }
        );
      });

      gsap.to(".hero-name", {
        scale: 1.04,
        textShadow: "0 0 48px rgba(66,245,215,.5)",
        scrollTrigger: { trigger: ".hero-scene", start: "top top", end: "+=90%", scrub: true }
      });

      gsap.to(".hero-orbit", {
        rotate: 48,
        scale: 1.08,
        scrollTrigger: { trigger: ".hero-scene", start: "top top", end: "+=180%", scrub: true }
      });

      gsap.to(".hero-float-left", {
        x: -70,
        y: -34,
        scrollTrigger: { trigger: ".hero-scene", start: "top top", end: "+=150%", scrub: true }
      });

      gsap.to(".hero-float-right", {
        x: 80,
        y: 40,
        scrollTrigger: { trigger: ".hero-scene", start: "top top", end: "+=150%", scrub: true }
      });

      gsap.to(".timeline-fill", {
        scaleY: 1,
        transformOrigin: "top",
        ease: "none",
        scrollTrigger: { trigger: ".timeline-list", start: "top center", end: "bottom center", scrub: true }
      });

      gsap.utils.toArray<HTMLElement>(".timeline-milestone").forEach((milestone) => {
        const card = milestone.querySelector(".timeline-card");
        const dot = milestone.querySelector(".timeline-dot");
        const year = milestone.querySelector(".timeline-year");
        const connector = milestone.querySelector(".timeline-connector");

        gsap.fromTo(
          [card, year],
          { opacity: 0.52, y: 34, scale: 0.965 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            ease: "none",
            scrollTrigger: { trigger: milestone, start: "top 68%", end: "center center", scrub: true }
          }
        );

        gsap.fromTo(
          dot,
          { scale: 0.78, filter: "brightness(0.85)" },
          {
            scale: 1.22,
            filter: "brightness(1.6)",
            ease: "none",
            scrollTrigger: { trigger: milestone, start: "top 58%", end: "bottom 42%", scrub: true }
          }
        );

        gsap.fromTo(
          connector,
          { scaleX: 0.2, opacity: 0.35, transformOrigin: "left" },
          {
            scaleX: 1,
            opacity: 1,
            ease: "none",
            scrollTrigger: { trigger: milestone, start: "top 62%", end: "center center", scrub: true }
          }
        );

        gsap.to(card, {
          boxShadow: "0 26px 90px rgba(53,167,255,0.18)",
          scrollTrigger: { trigger: milestone, start: "top 52%", end: "bottom 48%", scrub: true }
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((counter) => {
        const target = Number(counter.dataset.count || "0");
        const prefix = counter.dataset.prefix || "";
        const suffix = counter.dataset.suffix || "";
        const value = { current: 0 };

        gsap.to(value, {
          current: target,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: { trigger: counter, start: "top 82%", once: true },
          onUpdate: () => {
            const next = Math.round(value.current).toLocaleString();
            counter.textContent = `${prefix}${next}${suffix}`;
          }
        });
      });
    }, rootRef);

    return () => {
      context.revert();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return (
    <main ref={rootRef} className="relative bg-obsidian text-white">
      <NoiseOverlay />
      <ScrollProgress progress={scrollProgress} />
      <Header onAi={() => setAiOpen(true)} scrolled={navScrolled} />
      <HeroScene onAi={() => setAiOpen(true)} />
      <WhatIBuildSection />
      <ProjectStrip />
      <TimelineScene />
      <CoreCapabilitiesSection />
      <ProjectWorlds onOpen={setCaseStudyId} />
      <ProofMetrics />
      <CaseStudiesSection onOpen={setCaseStudyId} />
      <AIMalakiScene onAi={() => setAiOpen(true)} />
      <WorkWithMeSection onAi={() => setAiOpen(true)} />
      <FinalCTA onAi={() => setAiOpen(true)} />
      <Footer />
      <CaseStudyModal id={caseStudyId} onClose={() => setCaseStudyId(null)} />
      <AIMalakiModal open={aiOpen} onClose={() => setAiOpen(false)} />
    </main>
  );
}

function Header({ onAi, scrolled }: { onAi: () => void; scrolled: boolean }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["Projects", "#projects"],
    ["AI Malaki", "#ai-malaki"],
    ["Case Studies", "#case-studies"],
    ["Contact", "#contact"]
  ];

  return (
    <header
      className={`fixed left-1/2 top-4 z-40 w-[min(94vw,1100px)] -translate-x-1/2 rounded-full border px-4 py-2 backdrop-blur-xl transition ${
        scrolled
          ? "border-cyan/25 bg-[#070b14]/88 shadow-[0_0_46px_rgba(53,167,255,0.18)]"
          : "border-white/15 bg-[#070b14]/70"
      }`}
    >
      <nav className="flex items-center justify-between gap-4" aria-label="Main navigation">
        <a href="#top" className="flex items-center gap-3 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan">
          <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-cyan to-violet text-xs font-black shadow-glow">
            MA
          </span>
          <span className="hidden text-xs font-black uppercase tracking-[0.22em] sm:inline">Malaki Aiono</span>
        </a>
        <div className="hidden items-center gap-8 text-sm font-bold text-white/64 md:flex">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="transition hover:text-white">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAi}
            className="magnetic-button hidden rounded-full border border-cyan/35 bg-cyan/15 px-4 py-2 text-sm font-black shadow-glow transition hover:border-cyan/60 hover:bg-cyan/25 sm:inline-flex"
          >
            Talk To AI Malaki
          </button>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full border border-white/12 bg-white/[0.06] md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute left-0 right-0 top-[calc(100%+0.6rem)] rounded-2xl border border-white/12 bg-[#05070d] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.72)] md:hidden"
          >
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-bold text-white/72 hover:bg-white/[0.06] hover:text-white"
              >
                {label}
              </a>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                onAi();
              }}
              className="mt-2 w-full rounded-full border border-cyan/35 bg-cyan/15 px-4 py-3 text-sm font-black shadow-glow"
            >
              Talk To AI Malaki
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function SectionIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="js-scrub text-xs font-black uppercase tracking-[0.22em] text-cyan">{eyebrow}</div>
      <div className="mt-4 grid gap-5 md:grid-cols-[1.1fr_.8fr] md:items-end">
        <h2 className="js-scrub text-balance font-display text-4xl font-black leading-[0.95] md:text-6xl">{title}</h2>
        {copy ? <p className="js-scrub max-w-xl text-lg leading-relaxed text-silver">{copy}</p> : null}
      </div>
    </div>
  );
}

function HeroScene({ onAi }: { onAi: () => void }) {
  return (
    <section id="top" className="hero-scene scene js-pin flex min-h-[118svh] items-center pt-24">
      <AnimatedGrid />
      <ParticleField density={90} />
      <NeuralLines />
      <GradientOrb className="left-[-16rem] top-24 size-[38rem]" color="rgba(53, 167, 255, .24)" />
      <GradientOrb className="right-[-14rem] top-36 size-[34rem]" color="rgba(138, 92, 255, .24)" />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_.95fr] lg:items-center">
        <div>
          <IconBadge icon={Sparkles} label="MALAKI AIONO" className="js-scrub" />
          <h1 className="hero-name js-scrub mt-6 max-w-3xl font-display text-4xl font-black leading-[0.94] tracking-normal md:text-5xl 2xl:text-6xl">
            Building AI products, automation systems, and digital ventures from idea to traction.
          </h1>
          <div className="js-scrub mt-6 flex flex-wrap items-center gap-3 text-lg font-black text-white/86">
            <span>Now building</span>
            <RotatingWord />
          </div>
          <p className="js-scrub mt-5 max-w-2xl text-lg font-medium leading-relaxed text-silver md:text-xl">
            Founder, product builder, automation strategist, and growth-focused creator.
          </p>
          <div className="js-scrub mt-6 flex flex-wrap gap-4">
            <GlowButton onClick={onAi}>Talk To AI Malaki</GlowButton>
            <GlowLink href="#projects" variant="secondary">View Projects</GlowLink>
          </div>
          <div className="js-scrub mt-10 flex flex-wrap gap-2">
            {["AI Products", "Automation Systems", "Digital Ventures", "Growth Engines"].map((item) => (
              <span key={item} className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/60">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="js-scrub relative min-h-[560px]">
          <div className="hero-orbit absolute inset-0">
            <HeroNeuralGrid />
          </div>
          <div className="hero-float-left absolute left-0 top-10 w-64 rounded-2xl border border-cyan/22 bg-[#07101d]/82 p-4 shadow-glow backdrop-blur-xl">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan">AI product pipeline</div>
            <div className="mt-4 grid gap-2">
              {["Idea mapped", "Interface shipped", "Traction loop"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-sm font-bold text-white/78">
                  <span className="size-2 rounded-full bg-cyan shadow-glow" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="hero-float-right absolute bottom-24 right-0 w-72 rounded-2xl border border-violet/25 bg-[#07101d]/86 p-4 shadow-violet backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-white/50">
              <span>Founder interface</span>
              <span className="text-cyan">Live</span>
            </div>
            <AIMiniFlow />
          </div>
        </div>
      </div>
      <div className="absolute bottom-8 right-10 hidden items-center gap-2 text-xs font-bold text-white/45 md:flex">
        <MousePointer2 size={16} className="text-cyan" /> Scroll drives the story
      </div>
    </section>
  );
}

function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % rotatingWords.length), 1800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className="relative inline-flex min-w-[13.5rem] overflow-hidden rounded-full border border-cyan/25 bg-cyan/10 px-4 py-2 text-cyan shadow-glow">
      <AnimatePresence mode="wait">
        <motion.span
          key={rotatingWords[index]}
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -18, opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          {rotatingWords[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function WhatIBuildSection() {
  return (
    <section className="scene py-28">
      <AnimatedGrid />
      <SectionIntro
        eyebrow="WHAT I BUILD"
        title="Digital systems that turn ideas into traction."
        copy="I create AI products, automation systems, web applications, and growth engines that turn business ideas into working products."
      />
      <div className="mx-auto mt-14 grid max-w-6xl gap-4 px-6 md:grid-cols-2 lg:grid-cols-5">
        {whatIBuild.map((item, index) => {
          const Icon = buildIcons[index] || Sparkles;
          return (
            <motion.article
              key={item.title}
              whileHover={{ y: -8, scale: 1.015 }}
              className="js-reveal group min-h-72 rounded-2xl border border-white/12 bg-white/[0.045] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl transition hover:border-cyan/38 hover:bg-cyan/10"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-cyan/10 text-cyan shadow-glow">
                <Icon size={21} aria-hidden="true" />
              </span>
              <h3 className="mt-8 text-xl font-black leading-tight">{item.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-silver">{item.copy}</p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function ProjectStrip() {
  const badges = [...ventureBadges, ...ventureBadges];
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-white/[0.025] py-14">
      <div className="mx-auto max-w-6xl px-6">
        <p className="max-w-4xl text-balance font-display text-2xl font-black leading-tight text-white md:text-4xl">
          Projects, platforms, and ventures built across AI, Web3, automation, and property technology.
        </p>
      </div>
      <div className="strip-mask mt-10 overflow-hidden">
        <div className="strip-track flex w-max gap-4 px-6">
          {badges.map((badge, index) => (
            <span
              key={`${badge}-${index}`}
              className="rounded-full border border-white/12 bg-[#07101d]/82 px-6 py-4 text-sm font-black text-white/78 shadow-glow backdrop-blur-xl"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function TimelineScene() {
  return (
    <section id="timeline" className="timeline-scene scene py-28">
      <LightBeam />
      <SectionIntro
        eyebrow="ACHIEVEMENT TIMELINE"
        title="A timeline of launches, traction, AI systems, and product evolution."
        copy="The progress line fills as you scroll. Each year locks to a milestone, then brightens as it becomes active."
      />
      <div className="timeline-list relative mx-auto mt-16 max-w-6xl px-6">
        <div className="pointer-events-none absolute bottom-6 left-[calc(1.5rem+164px)] top-6 hidden w-px bg-white/10 md:left-[calc(1.5rem+164px)] lg:left-[calc(1.5rem+203px)]" aria-hidden="true">
          <div className="timeline-fill h-full w-px scale-y-0 bg-gradient-to-b from-auric via-cyan to-violet shadow-glow" />
        </div>
        <div className="space-y-10 md:space-y-14">
          {timeline.map((item, index) => (
            <TimelineMilestone key={item.id} milestone={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CoreCapabilitiesSection() {
  return (
    <section className="scene js-pin flex items-center py-28">
      <AnimatedGrid />
      <GradientOrb className="left-1/2 top-1/2 size-[42rem] -translate-x-1/2 -translate-y-1/2" color="rgba(66,245,215,.13)" />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
        <SectionIntro
          eyebrow="CORE CAPABILITIES"
          title="The builder stack behind the products."
          copy="From idea to interface, from workflow to launch, each project is built around product clarity, automation leverage, and market traction."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {coreCapabilities.map((item, index) => {
            const Icon = capabilityIcons[index] || Sparkles;
            return (
              <motion.article
                key={item.title}
                whileHover={{ y: -8 }}
                className="js-scrub rounded-2xl border border-white/12 bg-[#07101d]/82 p-6 shadow-[0_22px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl"
              >
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cyan/10 text-cyan">
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-2xl font-black">{item.title}</h3>
                    <p className="mt-3 leading-relaxed text-silver">{item.copy}</p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProjectWorlds({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div id="projects">
      <section className="scene py-24">
        <SectionIntro
          eyebrow="PROJECT WORLDS"
          title="Each project became its own system."
          copy="Immersive product worlds built around launch traction, AI workflows, creative platforms, and owner-facing lead engines."
        />
      </section>
      {projects.map((project) => (
        <section key={project.id} className="scene js-pin flex items-center py-28">
          <AnimatedGrid />
          <GradientOrb className="left-[-8rem] top-20 size-[30rem]" color={`${project.colorTheme.primary}2e`} />
          <DataStream rows={4} />
          <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-6 lg:grid-cols-[.85fr_1fr] lg:items-center">
            <div>
              <IconBadge icon={project.icons[0]} label={project.category} tone={project.colorTheme.primary} className="js-scrub" />
              <h2 className="js-scrub mt-6 font-display text-5xl font-black leading-[0.96] md:text-7xl">{project.name}</h2>
              <p className="js-scrub mt-5 text-2xl font-bold text-white/88">{project.headline}</p>
              <p className="js-scrub mt-5 leading-relaxed text-silver">{project.longDescription}</p>
              <div className="js-scrub mt-7 grid gap-3 sm:grid-cols-3">
                {project.metrics.map((metric) => (
                  <MetricCard key={metric.label} {...metric} tone={project.colorTheme.primary} />
                ))}
              </div>
              <button
                onClick={() => onOpen(project.id)}
                className="magnetic-button js-scrub mt-7 inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/12 px-6 py-3 font-black shadow-glow transition hover:bg-cyan/22"
              >
                View Case Study <ArrowUpRight size={18} />
              </button>
            </div>
            <div className="js-scrub">
              <ProjectVisual projectId={project.id} />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function ProjectVisual({ projectId }: { projectId: string }) {
  const project = projects.find((item) => item.id === projectId) || projects[0];

  if (projectId === "oprealm") {
    return (
      <FloatingPanel className="p-5">
        <PortalVisual />
      </FloatingPanel>
    );
  }

  if (projectId === "site-potential") {
    return (
      <FloatingPanel className="p-5">
        <MapGridVisual />
      </FloatingPanel>
    );
  }

  if (projectId === "ai-agent-automation") {
    return (
      <BrowserMockup title="Agent automation network">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Prompt intake", detail: "Visitor goal captured.", icon: MessageCircle },
            { label: "AI agent routes", detail: "Intent and context sorted.", icon: Bot },
            { label: "Workflow fires", detail: "Tools connect automatically.", icon: Workflow },
            { label: "Lead loop", detail: "Booking and follow-up ready.", icon: Funnel }
          ].map((step, index) => (
            <WorkflowNode key={step.label} {...step} active={index < 3} />
          ))}
        </div>
        <div className="mt-5">
          <AIMiniFlow />
        </div>
      </BrowserMockup>
    );
  }

  return <DashboardMockup project={project} />;
}

function ProofMetrics() {
  return (
    <section className="scene py-28">
      <AnimatedGrid />
      <SectionIntro eyebrow="PROOF" title="Launches, users, systems, and traction." />
      <div className="mx-auto mt-14 grid max-w-6xl gap-4 px-6 md:grid-cols-2 lg:grid-cols-5">
        {proofStats.map((stat) => (
          <article key={stat.label} className="js-reveal rounded-2xl border border-white/12 bg-white/[0.045] p-5 shadow-glow backdrop-blur-xl">
            <div
              className="font-display text-4xl font-black text-white md:text-5xl"
              data-count={stat.value}
              data-prefix={stat.prefix}
              data-suffix={stat.suffix}
            >
              {stat.prefix}0{stat.suffix}
            </div>
            <h3 className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-cyan">{stat.label}</h3>
            <p className="mt-4 text-sm leading-relaxed text-silver">{stat.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CaseStudiesSection({ onOpen }: { onOpen: (id: string) => void }) {
  const projectStudies = projects
    .map((project) => caseStudies.find((study) => study.id === project.id))
    .filter((study): study is NonNullable<typeof study> => Boolean(study));

  return (
    <section id="case-studies" className="scene py-28">
      <SectionIntro eyebrow="CASE STUDIES" title="What each project proves." />
      <div className="mx-auto mt-14 grid max-w-6xl gap-5 px-6 md:grid-cols-2">
        {projectStudies.map((study) => (
          <article key={study.id} className="js-reveal rounded-2xl border border-white/12 bg-[#07101d]/82 p-5 shadow-[0_22px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan">Case study</div>
            <h3 className="mt-3 font-display text-3xl font-black">{study.title}</h3>
            <div className="mt-5 grid gap-3">
              {[
                ["Problem", study.problem],
                ["Product built", study.productBuilt],
                ["Role", study.role],
                ["Result", study.result],
                ["What it proves", study.proves]
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/42">{label}</div>
                  <p className="mt-2 text-sm leading-relaxed text-silver">{value}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => onOpen(study.id)}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-4 py-2 text-sm font-bold transition hover:bg-cyan/20"
            >
              View Case Study <ArrowUpRight size={16} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function AIMalakiScene({ onAi }: { onAi: () => void }) {
  return (
    <section id="ai-malaki" className="scene js-pin py-28">
      <AnimatedGrid />
      <ParticleField density={60} />
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-5 md:grid-cols-[1fr_.72fr] md:items-end">
          <div>
            <div className="js-scrub text-xs font-black uppercase tracking-[0.22em] text-cyan">AI MALAKI</div>
            <h2 className="js-scrub mt-4 font-display text-5xl font-black leading-tight md:text-7xl">Ask the portfolio itself.</h2>
          </div>
          <p className="js-scrub text-lg leading-relaxed text-silver">This section demonstrates that I build AI systems. The current version uses polished front-end responses and can connect to backend automations when credentials are configured.</p>
        </div>
        <div className="js-scrub mt-12 rounded-2xl border border-white/15 bg-white/[0.045] p-4 md:p-8">
          <AIMalakiPanel />
        </div>
        <div className="js-scrub mt-6 flex flex-wrap gap-4">
          <button onClick={onAi} className="magnetic-button rounded-full border border-cyan/30 bg-cyan/14 px-6 py-3 font-black shadow-glow">
            Open AI Malaki Panel
          </button>
          <a href="#contact" className="rounded-full border border-auric/35 bg-auric/12 px-6 py-3 font-black shadow-gold">
            Contact Malaki
          </a>
        </div>
      </div>
    </section>
  );
}

function WorkWithMeSection({ onAi }: { onAi: () => void }) {
  return (
    <section id="contact" className="scene py-28">
      <AnimatedGrid />
      <SectionIntro eyebrow="WORK WITH ME" title="Ways to build leverage together." />
      <div className="mx-auto mt-14 grid max-w-6xl gap-5 px-6 lg:grid-cols-3">
        {workOffers.map((offer, index) => (
          <WorkOfferCard key={offer.title} offer={offer} index={index} onAi={onAi} />
        ))}
      </div>
      <div className="mx-auto mt-8 max-w-6xl px-6">
        <div className="rounded-2xl border border-white/12 bg-white/[0.045] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan">Contact</div>
              <a href="mailto:hello@malakiaiono.com" className="mt-2 inline-flex items-center gap-2 text-xl font-black text-white hover:text-cyan">
                <Mail size={20} /> hello@malakiaiono.com
              </a>
            </div>
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onAi }: { onAi: () => void }) {
  return (
    <section className="scene js-pin flex min-h-[105svh] items-center py-28">
      <AnimatedGrid />
      <ParticleField density={100} />
      <GradientOrb className="left-1/2 top-1/2 size-[44rem] -translate-x-1/2 -translate-y-1/2" color="rgba(66,245,215,.22)" />
      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        <div className="js-scrub text-xs font-black uppercase tracking-[0.24em] text-cyan">FINAL CTA</div>
        <h2 className="js-scrub mt-6 font-display text-5xl font-black leading-[0.96] md:text-8xl">
          I don&apos;t just build websites.
          <br />
          <span className="bg-gradient-to-r from-cyan via-white to-auric bg-clip-text text-transparent">I build leverage.</span>
        </h2>
        <p className="js-scrub mx-auto mt-6 max-w-3xl text-2xl font-bold text-white/82">
          AI products, automation systems, and digital ventures designed to create traction.
        </p>
        <div className="js-scrub mt-10 flex flex-wrap justify-center gap-4">
          <GlowButton onClick={onAi}>Talk To AI Malaki</GlowButton>
          <GlowLink href="#projects" variant="secondary">View Projects</GlowLink>
        </div>
      </div>
    </section>
  );
}

function WorkOfferCard({
  offer,
  index,
  onAi
}: {
  offer: (typeof workOffers)[number];
  index: number;
  onAi: () => void;
}) {
  const Icon = offerIcons[index] || Sparkles;
  const ctaClass =
    "mt-8 inline-flex w-full items-center justify-center rounded-full border border-cyan/30 bg-cyan/12 px-5 py-3 text-sm font-black shadow-glow transition hover:bg-cyan/20";

  return (
    <motion.article
      whileHover={{ y: -8 }}
      className="js-reveal rounded-2xl border border-white/12 bg-[#07101d]/86 p-6 shadow-[0_22px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-cyan/10 text-cyan">
          <Icon aria-hidden="true" />
        </span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-white/44">0{index + 1}</span>
      </div>
      <h3 className="mt-7 text-2xl font-black">{offer.title}</h3>
      <p className="mt-3 leading-relaxed text-silver">{offer.audience}</p>
      <div className="mt-6 space-y-3">
        {offer.includes.map((item) => (
          <div key={item} className="flex items-center gap-3 text-sm font-bold text-white/72">
            <Check size={16} className="text-cyan" aria-hidden="true" />
            {item}
          </div>
        ))}
      </div>
      {offer.cta === "Talk To AI Malaki" ? (
        <button onClick={onAi} className={ctaClass}>
          {offer.cta}
        </button>
      ) : (
        <a href={`mailto:hello@malakiaiono.com?subject=${encodeURIComponent(offer.title)}`} className={ctaClass}>
          {offer.cta}
        </a>
      )}
    </motion.article>
  );
}

function Footer() {
  const menu = [
    ["Projects", "#projects"],
    ["AI Malaki", "#ai-malaki"],
    ["Case Studies", "#case-studies"],
    ["Contact", "#contact"]
  ];
  const connect = [
    ["LinkedIn", "https://www.linkedin.com/"],
    ["X / Twitter", "https://x.com/"],
    ["GitHub", "https://github.com/"],
    ["Website", "https://malakiaiono.com/"]
  ];

  return (
    <footer className="border-t border-white/10 bg-[#05070d] px-6 py-12">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.2fr_.8fr_.8fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-cyan to-violet text-sm font-black shadow-glow">MA</span>
            <div>
              <div className="font-black">Malaki Aiono</div>
              <a href="mailto:hello@malakiaiono.com" className="text-sm text-silver hover:text-cyan">hello@malakiaiono.com</a>
            </div>
          </div>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-silver">
            Founder portfolio for AI products, automation systems, digital ventures, and growth-focused product builds.
          </p>
        </div>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan">Menu</div>
          <div className="mt-4 grid gap-2">
            {menu.map(([label, href]) => (
              <a key={href} href={href} className="text-sm font-bold text-white/62 hover:text-white">
                {label}
              </a>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan">Connect</div>
          <div className="mt-4 grid gap-2">
            {connect.map(([label, href]) => (
              <a key={label} href={href} className="text-sm font-bold text-white/62 hover:text-white">
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function ScrollProgress({ progress }: { progress: number }) {
  const percent = Math.round(progress * 100);
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 h-1 bg-white/8" aria-hidden="true">
      <div className="h-full bg-gradient-to-r from-cyan via-violet to-auric shadow-glow" style={{ width: `${percent}%` }} />
    </div>
  );
}

function GlowButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className="magnetic-button rounded-full border border-cyan/35 bg-cyan/18 px-6 py-3 font-black shadow-glow transition hover:border-cyan/60 hover:bg-cyan/26"
    >
      {children}
    </motion.button>
  );
}

function GlowLink({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <motion.a
      href={href}
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className={`magnetic-button rounded-full border px-6 py-3 font-black transition ${
        variant === "secondary"
          ? "border-auric/35 bg-auric/12 shadow-gold hover:bg-auric/20"
          : "border-cyan/35 bg-cyan/18 shadow-glow hover:bg-cyan/26"
      }`}
    >
      {children}
    </motion.a>
  );
}
