import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLogEntity } from "./entities/audit-log.entity";
import { PaginatedResponse, PaginationQueryDto } from "@/common/dto/pagination-query.dto";

@Injectable()
export class AuditLogService {
  constructor(@InjectRepository(AuditLogEntity) private readonly logs: Repository<AuditLogEntity>) {}

  async record(entry: {
    actorId: string;
    actorEmail: string;
    module: string;
    action: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
  }): Promise<void> {
    await this.logs.save(this.logs.create(entry));
  }

  // Sprint 6 §15 — read-only query, optionally scoped to a module or
  // entity — e.g. "show me every change made to product X" (linked
  // from Product Management per the spec) or "show me the full login
  // activity log" (module: "auth").
  async list(query: PaginationQueryDto & { module?: string; entityId?: string }): Promise<PaginatedResponse<AuditLogEntity>> {
    const qb = this.logs.createQueryBuilder("log").orderBy("log.createdAt", "DESC");
    if (query.module) qb.andWhere("log.module = :module", { module: query.module });
    if (query.entityId) qb.andWhere("log.entityId = :entityId", { entityId: query.entityId });

    const [items, totalItems] = await qb
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    return PaginatedResponse.of(items, totalItems, query.page, query.pageSize);
  }

  // Sprint 6 — Recent Activity feed for the Dashboard (Phase 6 §1).
  async getRecentActivity(limit = 10): Promise<AuditLogEntity[]> {
    return this.logs.find({ order: { createdAt: "DESC" }, take: limit });
  }
}
