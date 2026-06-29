"use client";

import { motion } from "framer-motion";

export function NoiseOverlay() {
  return <div className="noise" aria-hidden="true" />;
}

export function AnimatedGrid({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 grid-bg opacity-60 [mask-image:radial-gradient(circle_at_center,black,transparent_76%)] ${className}`}
      aria-hidden="true"
    />
  );
}

export function GradientOrb({
  className = "",
  color = "rgba(53, 167, 255, 0.4)"
}: {
  className?: string;
  color?: string;
}) {
  return (
    <motion.div
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      style={{ background: color }}
      animate={{ scale: [1, 1.16, 1], opacity: [0.42, 0.72, 0.42] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    />
  );
}

export function ParticleField({ density = 70 }: { density?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: density }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute size-1 rounded-full bg-cyan/70"
          style={{
            left: `${(index * 37) % 100}%`,
            top: `${(index * 61) % 100}%`,
            opacity: 0.18 + (index % 5) * 0.08
          }}
          animate={{ y: [0, -18 - (index % 24), 0], x: [0, (index % 2 ? 1 : -1) * 12, 0] }}
          transition={{ duration: 5 + (index % 9), repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export function NeuralLines() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-55" aria-hidden="true">
      <defs>
        <linearGradient id="neuralLine" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#35a7ff" stopOpacity=".05" />
          <stop offset=".5" stopColor="#42f5d7" stopOpacity=".55" />
          <stop offset="1" stopColor="#8a5cff" stopOpacity=".05" />
        </linearGradient>
      </defs>
      {Array.from({ length: 14 }).map((_, index) => (
        <motion.path
          key={index}
          d={`M ${-80 + index * 54} ${120 + (index % 4) * 80} C ${240 + index * 16} ${20 + index * 28}, ${600 - index * 10} ${420 - index * 18}, ${1320 - index * 38} ${130 + (index % 5) * 82}`}
          stroke="url(#neuralLine)"
          strokeWidth="1.2"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0.15, 1, 0.15] }}
          transition={{ duration: 7 + index * 0.3, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}

export function DataStream({ rows = 6 }: { rows?: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 flex -translate-y-1/2 flex-col gap-6 opacity-40" aria-hidden="true">
      {Array.from({ length: rows }).map((_, row) => (
        <motion.div
          key={row}
          className="flex gap-4 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.3em] text-cyan/50"
          animate={{ x: row % 2 ? ["0%", "-35%"] : ["-35%", "0%"] }}
          transition={{ duration: 18 + row * 2, repeat: Infinity, ease: "linear" }}
        >
          {Array.from({ length: 10 }).map((__, i) => (
            <span key={i}>AI_PRODUCTS / AUTOMATION / LEADS / REVENUE / MVP /</span>
          ))}
        </motion.div>
      ))}
    </div>
  );
}

export function GlowRing({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full border border-cyan/20 shadow-[0_0_80px_rgba(66,245,215,0.18)] ${className}`}
      aria-hidden="true"
    />
  );
}

export function LightBeam() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-0 h-full w-[42rem] -translate-x-1/2 bg-gradient-to-b from-cyan/10 via-violet/10 to-transparent blur-2xl"
      aria-hidden="true"
    />
  );
}

export function HeroNeuralGrid() {
  return (
    <svg viewBox="0 0 900 700" className="h-full w-full" role="img" aria-label="Neural grid around Malaki Aiono monogram">
      <defs>
        <radialGradient id="avatarGlow">
          <stop stopColor="#42f5d7" stopOpacity=".8" />
          <stop offset=".55" stopColor="#35a7ff" stopOpacity=".22" />
          <stop offset="1" stopColor="#05070d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="avatar" x1="0" x2="1">
          <stop stopColor="#42f5d7" />
          <stop offset="1" stopColor="#8a5cff" />
        </linearGradient>
      </defs>
      <rect x="74" y="44" width="720" height="560" rx="34" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.18)" />
      <circle cx="434" cy="320" r="205" fill="none" stroke="#42f5d7" strokeOpacity=".22" />
      <circle cx="434" cy="320" r="145" fill="none" stroke="#fff" strokeOpacity=".12" strokeDasharray="10 18" />
      <circle cx="434" cy="320" r="92" fill="url(#avatarGlow)" />
      <rect x="345" y="230" width="178" height="178" rx="44" fill="url(#avatar)" />
      <text x="434" y="342" textAnchor="middle" fill="white" fontSize="62" fontWeight="800" fontFamily="Inter, Arial">MA</text>
      {[
        ["AI Products", 188, 92],
        ["Scroll Symphony", 310, 58],
        ["Automation", 610, 166],
        ["Growth", 194, 430],
        ["Ventures", 614, 462]
      ].map(([label, x, y]) => (
        <g key={label}>
          <rect x={Number(x)} y={Number(y)} width="190" height="48" rx="15" fill="#080d18" stroke="rgba(255,255,255,.25)" />
          <text x={Number(x) + 58} y={Number(y) + 31} fill="#eaf6ff" fontSize="18" fontWeight="700" fontFamily="Inter, Arial">
            {label}
          </text>
          <circle cx={Number(x) + 30} cy={Number(y) + 24} r="8" fill="#42f5d7" />
        </g>
      ))}
    </svg>
  );
}

export function PortalVisual() {
  return (
    <svg viewBox="0 0 520 360" className="h-full w-full" role="img" aria-label="OPRealm glowing creative portal">
      <defs>
        <radialGradient id="portal"><stop stopColor="#8a5cff"/><stop offset=".55" stopColor="#35a7ff" stopOpacity=".24"/><stop offset="1" stopColor="#05070d" stopOpacity="0"/></radialGradient>
      </defs>
      <circle cx="260" cy="178" r="132" fill="url(#portal)" />
      <circle cx="260" cy="178" r="92" fill="none" stroke="#42f5d7" strokeOpacity=".4" strokeWidth="2" />
      <circle cx="260" cy="178" r="62" fill="none" stroke="#fff" strokeOpacity=".2" strokeDasharray="8 12" />
      {["Story", "Game", "Video", "Comic", "World"].map((label, index) => (
        <g key={label} transform={`translate(${80 + index * 84} ${250 - (index % 2) * 150}) rotate(${index * 4 - 8})`}>
          <rect width="74" height="94" rx="14" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.18)" />
          <rect x="12" y="14" width="50" height="34" rx="8" fill={index % 2 ? "#35a7ff55" : "#8a5cff55"} />
          <text x="37" y="72" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">{label}</text>
        </g>
      ))}
    </svg>
  );
}

export function MapGridVisual() {
  return (
    <svg viewBox="0 0 560 360" className="h-full w-full" role="img" aria-label="Site Potential property map scan and feasibility report">
      <rect width="560" height="360" rx="24" fill="rgba(8,13,24,.7)" />
      {Array.from({ length: 8 }).map((_, i) => <path key={`h${i}`} d={`M0 ${i * 48}H560`} stroke="white" strokeOpacity=".08" />)}
      {Array.from({ length: 12 }).map((_, i) => <path key={`v${i}`} d={`M${i * 52} 0V360`} stroke="white" strokeOpacity=".08" />)}
      <path d="M40 260L150 210L230 242L322 160L505 116" stroke="#42f5d7" strokeOpacity=".45" strokeWidth="3" fill="none" />
      {[[118, 104], [270, 150], [390, 86], [430, 220]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="82" height="58" rx="10" fill={i === 1 ? "#42f5d766" : "#35a7ff33"} stroke="#42f5d7" strokeOpacity=".55" />
      ))}
      <rect x="318" y="204" width="190" height="104" rx="16" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.18)" />
      <text x="338" y="236" fill="white" fontSize="18" fontWeight="800">AI Feasibility</text>
      <text x="338" y="265" fill="#42f5d7" fontSize="13" fontWeight="700">Opportunity detected</text>
      <rect x="338" y="282" width="118" height="10" rx="5" fill="#f6c65b" opacity=".75" />
    </svg>
  );
}

