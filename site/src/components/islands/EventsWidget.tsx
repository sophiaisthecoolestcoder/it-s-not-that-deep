/**
 * Upcoming-events widget — fetches from the backend's public endpoint.
 *
 * Rendered as a React island (Astro hydrates it on idle) so the rest of the
 * page stays static and SEO-indexed. The initial paint shows a skeleton while
 * the network round-trip completes; if the backend is unreachable we fall
 * back to a quiet "no events" message rather than noisy error text.
 */
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { listPublicEvents, type PublicEvent } from "@/lib/api";

interface Props {
  upcomingDays?: number;
  /** Max number of events to render; default 4. */
  limit?: number;
}

const DATE_FMT = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const TIME_FMT = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

function EventCard({ event }: { event: PublicEvent }) {
  const start = new Date(event.starts_at);
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="border-t border-sand-300 pt-6"
    >
      <div className="eyebrow mb-2">{DATE_FMT.format(start)}</div>
      <h3 className="font-display text-2xl text-ink-500 leading-snug mb-2">{event.title}</h3>
      {event.description && (
        <p className="font-serif text-ink-400 leading-relaxed max-w-xl">{event.description}</p>
      )}
      <div className="mt-3 text-xs font-sans tracking-widest uppercase text-ink-400">
        {event.is_all_day ? "Ganztägig" : TIME_FMT.format(start)}
        {event.location ? <span className="mx-2">·</span> : null}
        {event.location}
      </div>
    </motion.article>
  );
}

export default function EventsWidget({ upcomingDays = 90, limit = 4 }: Props) {
  const [events, setEvents] = useState<PublicEvent[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listPublicEvents(upcomingDays)
      .then((rows) => {
        if (!cancelled) setEvents(rows.slice(0, limit));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [upcomingDays, limit]);

  if (error || (events && events.length === 0)) {
    return (
      <p className="font-serif italic text-ink-400">
        Derzeit sind keine öffentlichen Veranstaltungen angekündigt.
      </p>
    );
  }
  if (!events) {
    return (
      <div className="space-y-8 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-t border-sand-300 pt-6">
            <div className="h-3 w-40 bg-sand-200 rounded mb-3" />
            <div className="h-6 w-3/4 bg-sand-200 rounded mb-2" />
            <div className="h-3 w-1/2 bg-sand-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {events.map((e, i) => (
        <EventCard key={`${e.event_id}-${i}`} event={e} />
      ))}
    </div>
  );
}
