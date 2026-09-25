import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, type JwtModuleOptions } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminUserEntity } from "./entities/admin-user.entity";
import { AdminAuthService } from "./admin-auth.service";
import { AdminAuthController } from "./admin-auth.controller";
import { AuditModule } from "@/admin/audit/audit.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUserEntity]),
    AuditModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>("jwt.secret"),
        signOptions: {
          expiresIn: config.get<NonNullable<JwtModuleOptions["signOptions"]>["expiresIn"]>("jwt.accessTokenTtl"),
        },
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
