/**
 * Hamburger + full-screen slide-in menu.
 *
 * React island (not Astro) so we can animate the pane with Framer Motion.
 * Hydrates on idle — not needed on first paint.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  overlay?: boolean;
}

const LINKS: { label: string; href: string }[] = [
  { label: "Zimmer & Suiten", href: "/rooms" },
  { label: "Landtherme Spa", href: "/spa" },
  { label: "Veranstaltungen", href: "/events" },
  { label: "Galerie", href: "/gallery" },
  { label: "Geschichten", href: "/stories" },
  { label: "Kontakt", href: "/contact" },
];

export default function HamburgerMenu({ overlay = false }: Props) {
  const [open, setOpen] = useState(false);

  // Close on route change (View Transitions fire this event).
  useEffect(() => {
    const onNav = () => setOpen(false);
    document.addEventListener("astro:after-swap", onNav);
    return () => document.removeEventListener("astro:after-swap", onNav);
  }, []);

  // Lock scroll while menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
        aria-expanded={open}
        className={`w-10 h-10 flex flex-col items-center justify-center gap-[5px] ${
          overlay ? "text-white" : "text-ink-500"
        } hover:opacity-70 transition-opacity`}
      >
        <span className="block w-6 h-px bg-current"></span>
        <span className="block w-6 h-px bg-current"></span>
        <span className="block w-6 h-px bg-current"></span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 bg-ink-500 flex"
          >
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full md:w-2/3 bg-sand-50 px-10 py-12 relative flex flex-col"
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Menü schließen"
                className="absolute top-6 right-8 text-ink-500 font-sans text-xs tracking-widest uppercase hover:text-sand-600"
              >
                Schließen ×
              </button>

              <div className="eyebrow mt-8 mb-12">Bleiche Resort &amp; Spa</div>

              <nav className="flex-1 flex items-center">
                <ul className="space-y-6 md:space-y-8">
                  {LINKS.map((link, i) => (
                    <motion.li
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <a
                        href={link.href}
                        className="font-display text-4xl md:text-6xl text-ink-500 hover:text-sand-600 transition-colors"
                      >
                        {link.label}
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              <div className="mt-8 pt-8 border-t border-sand-200 font-sans text-xs tracking-widest uppercase text-ink-400">
                <a href="mailto:info@bleiche-resort.de" className="mr-6 hover:text-sand-600">
                  info@bleiche-resort.de
                </a>
                <a href="tel:+49356036200" className="hover:text-sand-600">
                  +49 35603 620
                </a>
              </div>
            </motion.aside>

            {/* Right-hand photo pane, desktop only. Replace with a real image. */}
            <div
              className="hidden md:block flex-1 bg-cover bg-center"
              style={{ backgroundImage: "url('/assets/images/menu-side.jpg')" }}
              aria-hidden="true"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
