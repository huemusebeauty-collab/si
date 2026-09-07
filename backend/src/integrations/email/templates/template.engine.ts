// Sprint 5.4 — Template engine integration. Deliberately minimal
// ({{variable}} substitution, no logic/loops) rather than pulling in a
// full template engine dependency (Handlebars, EJS, ...) — Sprint 5's
// email content needs (a handful of transactional templates with
// simple variable interpolation) don't need more than this. Documented
// as a Known Issue if a future sprint needs conditionals/loops in
// templates (e.g. an order confirmation with a variable-length line-item
// list) — this engine would need to be swapped or extended at that point.
export function renderTemplate(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return key in variables ? String(variables[key]) : `{{${key}}}`;
  });
}
