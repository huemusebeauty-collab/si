export type WebsiteActionView = {
  productId: string;
  score: number;
  priority: "high" | "medium" | "low";
  opportunity: string;
  reason: string;
  recommendedAction: string;
};

export function websiteIntelligencePanel(actions: WebsiteActionView[]): string {
  if (!actions.length) {
    return `<div class="muted">No strong website opportunities right now ✨</div>`;
  }
  return actions.slice(0, 6).map((item) => `
    <div class="wi-row">
      <div><b>${escapeHtml(item.productId)}</b><div class="muted">${escapeHtml(item.reason)}</div></div>
      <div class="wi-score"><strong>${item.score}</strong><span>${escapeHtml(item.priority)}</span></div>
      <div class="muted">${escapeHtml(item.recommendedAction)}</div>
    </div>`).join("");
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>\"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[char] ?? char);
}
