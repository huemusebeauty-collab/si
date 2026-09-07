// Minimal className-join utility (no external dependency needed for the
// current component set's needs).
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
