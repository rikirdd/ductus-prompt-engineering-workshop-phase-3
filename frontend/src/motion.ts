/** True when the user asked the operating system for less motion. Safe where `matchMedia` is missing. */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
