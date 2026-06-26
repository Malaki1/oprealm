import { Button } from "@/components/Button";

export function SearchPanel() {
  return (
    <form
      id="planner"
      className="mx-auto grid w-full max-w-[1160px] gap-3 rounded-lg border border-navy/10 bg-warm-cream p-3 shadow-premium md:grid-cols-[1.1fr_1fr_1fr_1fr_auto] md:items-end"
      aria-label="Trip planner"
    >
      <label className="grid gap-1 rounded-md border border-navy/10 bg-white/55 px-4 py-3">
        <span className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-ocean">Starting From</span>
        <select className="min-h-8 bg-transparent text-sm font-semibold text-navy">
          <option>Any location</option>
          <option>Melbourne</option>
          <option>Brisbane</option>
          <option>Sydney</option>
          <option>Perth</option>
        </select>
      </label>
      <label className="grid gap-1 rounded-md border border-navy/10 bg-white/55 px-4 py-3">
        <span className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-ocean">Trip Style</span>
        <select className="min-h-8 bg-transparent text-sm font-semibold text-navy">
          <option>Any style</option>
          <option>Coastal Escapes</option>
          <option>Hinterland Retreats</option>
          <option>Wine Regions</option>
        </select>
      </label>
      <label className="grid gap-1 rounded-md border border-navy/10 bg-white/55 px-4 py-3">
        <span className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-ocean">Dates</span>
        <input className="min-h-8 bg-transparent text-sm font-semibold text-navy" type="text" placeholder="Add dates" />
      </label>
      <label className="grid gap-1 rounded-md border border-navy/10 bg-white/55 px-4 py-3">
        <span className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-ocean">Duration</span>
        <select className="min-h-8 bg-transparent text-sm font-semibold text-navy">
          <option>Any duration</option>
          <option>3-4 Days</option>
          <option>5-7 Days</option>
          <option>8+ Days</option>
        </select>
      </label>
      <Button className="h-full w-full md:min-w-40" type="submit">
        Explore Trips
      </Button>
    </form>
  );
}
