import { MarketingHqDashboard, MarketingHqDashboardData } from "./marketing-hq-dashboard";
import { MarketingControlApi } from "./marketing-control-api";
import { MarketingIntelligenceInput } from "./marketing-intelligence-orchestrator";

export class MarketingDashboardApi {
  private readonly control = new MarketingControlApi();
  private readonly dashboard = new MarketingHqDashboard();

  snapshot(input: MarketingIntelligenceInput): MarketingHqDashboardData {
    const result = this.control.evaluate(input);
    return this.dashboard.build(result.data!, this.control.approvals().data ?? [], this.control.audit().data ?? []);
  }

  health() {
    return this.control.health();
  }

  approvals() {
    return this.control.approvals();
  }

  audit() {
    return this.control.audit();
  }
}
