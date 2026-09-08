export type HqWorkspaceId =
  | "overview"
  | "grow"
  | "money"
  | "content"
  | "social"
  | "creators"
  | "b2b"
  | "campaigns"
  | "ads"
  | "analytics"
  | "operations"
  | "approvals";

export interface HqWorkspace {
  id: HqWorkspaceId;
  label: string;
  description: string;
  status: "active" | "foundation";
}

export const HQ_WORKSPACES: readonly HqWorkspace[] = [
  { id: "overview", label: "Overview", description: "Director and business cockpit", status: "active" },
  { id: "grow", label: "Grow", description: "Growth, demand and next actions", status: "foundation" },
  { id: "money", label: "Money", description: "Revenue, orders and commercial signals", status: "active" },
  { id: "content", label: "Content", description: "Content planning and performance", status: "foundation" },
  { id: "social", label: "Social", description: "Connected social channels and publishing", status: "foundation" },
  { id: "creators", label: "Creators", description: "Creator collaboration lifecycle", status: "foundation" },
  { id: "b2b", label: "B2B", description: "Wholesale and opportunity pipeline", status: "foundation" },
  { id: "campaigns", label: "Campaigns", description: "Campaign planning and control", status: "foundation" },
  { id: "ads", label: "Ads", description: "Ad drafts, budgets and approvals", status: "foundation" },
  { id: "analytics", label: "Analytics", description: "Attribution, learning and revenue", status: "foundation" },
  { id: "operations", label: "Operations", description: "Schedulers, monitors and system health", status: "foundation" },
  { id: "approvals", label: "Approvals", description: "Human approval and safety trail", status: "active" },
];

export function getWorkspace(id: string): HqWorkspace | undefined {
  return HQ_WORKSPACES.find((workspace) => workspace.id === id);
}
