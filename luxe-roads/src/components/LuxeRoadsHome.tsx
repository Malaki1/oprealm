import {
  addOns,
  categories,
  featuredTrips,
  footerLinks,
  heroImage,
  ownerCtas,
  processSteps,
  reviews,
  stays,
  trustBadges,
  vans
} from "@/data/luxeRoads";
import { AddOnIcon } from "@/components/AddOnIcon";
import { Button } from "@/components/Button";
import { CategoryScroller } from "@/components/CategoryScroller";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProcessStep } from "@/components/ProcessStep";
import { ReviewCard } from "@/components/ReviewCard";
import { RoadTripCard } from "@/components/RoadTripCard";
import { ScenicImage } from "@/components/ScenicImage";
import { SearchPanel } from "@/components/SearchPanel";
import { SectionHeader } from "@/components/SectionHeader";
import { SplitCTA } from "@/components/SplitCTA";
import { StayCard } from "@/components/StayCard";
import { StickyMobileCTA } from "@/components/StickyMobileCTA";
import { TrustBadge } from "@/components/TrustBadge";
import { VanCard } from "@/components/VanCard";

export function LuxeRoadsHome() {
  return (
    <main id="home" className="min-h-screen bg-cream">
      <Header />

      <section className="relative" aria-labelledby="hero-heading">
        <ScenicImage image={heroImage} className="min-h-[660px] md:min-h-[720px] lg:min-h-[760px]">
          <div className="hero-vignette absolute inset-0 z-10" />
          <div className="absolute inset-0 z-20 mx-auto flex max-w-content items-center px-5 pb-28 pt-16 md:px-8 md:pb-36">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-gold">Luxe Roads</p>
              <h1 id="hero-heading" className="mt-5 font-serif text-6xl font-normal leading-[0.96] text-navy text-balance md:text-7xl lg:text-8xl">
                Luxury road trips across Australia
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-charcoal/78 md:text-xl">
                Choose a curated itinerary, book a premium campervan, and travel with support.
              </p>
              <div className="mt-8">
                <Button href="#featured-trips">Explore Trips</Button>
              </div>
            </div>
          </div>
        </ScenicImage>
        <div className="relative z-30 -mt-24 px-5 md:-mt-20 md:px-8">
          <SearchPanel />
        </div>
      </section>

      <section id="browse" className="mx-auto max-w-content px-5 py-20 md:px-8 md:py-24" aria-labelledby="browse-heading">
        <SectionHeader id="browse-heading" eyebrow="Browse by style" title="Find the perfect road trip for you" />
        <CategoryScroller categories={categories} />
      </section>

      <section id="featured-trips" className="bg-warm-cream px-5 py-20 md:px-8 md:py-24" aria-labelledby="featured-heading">
        <div className="mx-auto max-w-content">
          <SectionHeader
            id="featured-heading"
            eyebrow="Featured itineraries"
            title="Featured luxury road trips"
            action={
              <a className="text-sm font-semibold text-ocean transition hover:text-gold" href="#planner">
                View all trips
              </a>
            }
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featuredTrips.map((trip) => (
              <RoadTripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-content px-5 py-20 md:px-8 md:py-24" aria-labelledby="process-heading">
        <SectionHeader id="process-heading" eyebrow="How it works" title="Luxury travel made effortless" />
        <div className="relative">
          <div className="absolute left-[12%] right-[12%] top-12 hidden border-t border-dashed border-gold/55 lg:block" />
          <div className="-mx-5 overflow-x-auto px-5 pb-2 hide-scrollbar md:mx-0 md:px-0">
            <div className="flex min-w-max gap-7 lg:min-w-0 lg:justify-between">
              {processSteps.map((step, index) => (
                <ProcessStep key={step.id} step={step} index={index} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="campervans" className="bg-warm-cream px-5 py-20 md:px-8 md:py-24" aria-labelledby="vans-heading">
        <div className="mx-auto max-w-content">
          <SectionHeader
            id="vans-heading"
            eyebrow="Premium campervan collection"
            title="Travel in comfort, arrive in style"
            copy="Modern vans. Thoughtful details. Built for the open road."
            align="left"
            action={
              <Button href="#planner" variant="ghost">
                View All Campervans
              </Button>
            }
          />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {vans.map((van) => (
              <VanCard key={van.id} van={van} />
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="mx-auto max-w-content px-5 py-20 md:px-8 md:py-24" aria-labelledby="trust-heading">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Trusted by travellers</p>
            <h2 id="trust-heading" className="mt-4 font-serif text-5xl leading-[1.02] text-navy text-balance">
              Reassurance for the road ahead
            </h2>
            <p className="mt-5 text-base leading-7 text-charcoal/72">
              Example testimonials and reassurance notes are included as demo content until real Luxe Roads proof points are supplied.
            </p>
          </div>
          <div className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-3">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {trustBadges.map((badge) => (
                <TrustBadge key={badge.id} badge={badge} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="stays" className="bg-warm-cream px-5 py-20 md:px-8 md:py-24" aria-labelledby="stays-heading">
        <div className="mx-auto max-w-content">
          <SectionHeader id="stays-heading" eyebrow="Luxe Stays" title="Stay somewhere special" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stays.map((stay) => (
              <StayCard key={stay.id} stay={stay} />
            ))}
          </div>
        </div>
      </section>

      <section id="experiences" className="mx-auto max-w-content px-5 py-20 md:px-8 md:py-24" aria-labelledby="addons-heading">
        <SectionHeader id="addons-heading" eyebrow="Add-ons & experiences" title="Elevate your journey" />
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-7">
          {addOns.map((addOn) => (
            <AddOnIcon key={addOn.id} addOn={addOn} />
          ))}
        </div>
      </section>

      <section id="owners" className="mx-auto max-w-content px-5 pb-20 md:px-8 md:pb-24" aria-label="Owners and investors">
        <SplitCTA items={ownerCtas} />
      </section>

      <FinalCTA />
      <Footer columns={footerLinks} />

      <StickyMobileCTA />
    </main>
  );
}
