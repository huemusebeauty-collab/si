const { Client } = require("pg");
const bcrypt = require("bcrypt");

const statements = [
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "hsnCode" varchar(32)`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "gstRate" numeric(5,2)`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "taxInclusiveMrp" boolean NOT NULL DEFAULT true`,
  `ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "mrp" numeric(10,2)`,
  `UPDATE "product_variants" v SET "mrp" = p."price" FROM "products" p WHERE p."id" = v."productId" AND v."mrp" IS NULL`,
  `ALTER TABLE "order_line_items" ADD COLUMN IF NOT EXISTS "mrp" numeric(10,2)`,
  `ALTER TABLE "order_line_items" ADD COLUMN IF NOT EXISTS "hsnCode" varchar(32)`,
  `ALTER TABLE "order_line_items" ADD COLUMN IF NOT EXISTS "gstRate" numeric(5,2)`,
  `ALTER TABLE "order_line_items" ADD COLUMN IF NOT EXISTS "taxInclusiveMrp" boolean NOT NULL DEFAULT true`,
  `ALTER TABLE "order_line_items" ADD COLUMN IF NOT EXISTS "discountAmount" numeric(10,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "order_line_items" ADD COLUMN IF NOT EXISTS "taxableAmount" numeric(10,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "order_line_items" ADD COLUMN IF NOT EXISTS "taxAmount" numeric(10,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "subtotal" numeric(10,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discountAmount" numeric(10,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "taxableAmount" numeric(10,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "taxAmount" numeric(10,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "phoneNumber" varchar(32)`,
  `ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "otpHash" varchar(128)`,
  `ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "otpExpiresAt" timestamptz`,
  `ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "otpAttempts" integer NOT NULL DEFAULT 0`,
  `UPDATE "orders" SET "subtotal" = "total" WHERE "subtotal" = 0 AND "total" <> 0`,
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    for (const statement of statements) await client.query(statement);

    // One-time emergency admin password reset. The secret is supplied only via
    // Render environment variables and is intentionally never logged.
    if (process.env.ADMIN_PASSWORD_RESET) {
      const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD_RESET, 12);
      const result = await client.query(
        `UPDATE "admin_users" SET "passwordHash" = $1 WHERE "email" = $2`,
        [passwordHash, "admin@huemusebeauty.local"],
      );
      if (result.rowCount !== 1) throw new Error("Admin password reset target was not found.");
      console.log("Admin password reset completed.");
    }

    await client.query("COMMIT");
    console.log("GST/MRP schema is ready.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("GST/MRP schema bootstrap failed:", error);
  process.exit(1);
});
