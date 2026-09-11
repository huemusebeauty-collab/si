import { MarketingAction, MarketingSecurityLayer } from "./marketing-security";

export interface DirectorAction {
  action: MarketingAction;
  reason: string;
  confidence: number;
  requiresApproval: boolean;
  target?: string;
}

export interface ControlPlaneResult {
  status: "approval_required" | "ready" | "blocked";
  action: MarketingAction | null;
  reason: string;
  confidence: number;
  requiresApproval: boolean;
  target?: string;
  approvalRequestId?: string;
  decisionId?: string;
}

const ACTION_KEYWORDS: Array<[MarketingAction, string[]]> = [
  ["contact_creator", ["creator"]],
  ["b2b_outreach", ["b2b", "wholesale", "retail", "business opportunity"]],
  ["launch_ads", ["ad", "ads", "advertising", "campaign"]],
  ["reply_comment", ["reply", "comment"]],
  ["send_message", ["message", "dm", "direct message"]],
  ["change_budget", ["budget"]],
  ["publish_content", ["publish", "content", "experiment", "promote", "create"]],
];

export function normalizeDirectorAction(text: string): MarketingAction | null {
  const value = String(text ?? "").trim().toLowerCase();
  if (!value) return null;
  for (const [action, keywords] of ACTION_KEYWORDS) if (keywords.some((keyword) => value.includes(keyword))) return action;
  return null;
}

export class MarketingControlPlane {
  constructor(private readonly security: MarketingSecurityLayer) {}

  prepare(action: DirectorAction, actor = "marketing-director"): ControlPlaneResult {
    if (!action.action || !action.reason) throw new Error("Director action and reason are required");
    if (!Number.isFinite(action.confidence) || action.confidence < 0 || action.confidence > 1) throw new Error("Director confidence must be between 0 and 1");
    const approvalRequired = action.requiresApproval || this.security.requiresApproval(action.action);
    if (!approvalRequired) return { status: "ready", action: action.action, reason: action.reason, confidence: action.confidence, requiresApproval: false, target: action.target };
    const approval = this.security.requestApproval({ requestId: `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, action: action.action, actor, target: action.target, reason: action.reason });
    return { status: "approval_required", action: action.action, reason: action.reason, confidence: action.confidence, requiresApproval: true, target: action.target, approvalRequestId: approval.requestId };
  }

  prepareFromDirector(decision: { action: string; reason: string; confidence: number; requiresApproval: boolean; target?: string }, actor = "marketing-director"): ControlPlaneResult {
    const action = normalizeDirectorAction(decision.action);
    if (!action) return { status: "blocked", action: null, reason: `No executable control-plane action mapping for Director action: ${decision.action}`, confidence: decision.confidence, requiresApproval: false, target: decision.target };
    return this.prepare({ action, reason: decision.reason, confidence: decision.confidence, requiresApproval: decision.requiresApproval, target: decision.target }, actor);
  }

  canExecute(action: MarketingAction, approvalRequestId?: string): boolean { return this.security.canExecute(action, approvalRequestId); }
}
