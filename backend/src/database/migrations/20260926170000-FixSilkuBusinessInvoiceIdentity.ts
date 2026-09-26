import { MigrationInterface, QueryRunner } from "typeorm";

export class FixSilkuBusinessInvoiceIdentity20260926170000 implements MigrationInterface {
  name = "FixSilkuBusinessInvoiceIdentity20260926170000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "business_settings"
      SET
        "storeName" = 'Silku',
        "supportEmail" = 'silku981@gmail.com',
        "supportPhone" = '+91-7339899606',
        "businessAddress" = '99, Nimera, Jaipur, Rajasthan, India 303005',
        "legalEntityName" = 'Shree Khatu Shyam Health Care',
        "gstRegistered" = true,
        "gstin" = '08FYZPB1721H1Z7',
        "registeredAddress" = '99, Nimera, Jaipur, Rajasthan, India 303005',
        "registeredState" = 'Rajasthan',
        "registeredStateCode" = '08',
        "currency" = 'INR',
        "currencyDisplayLocale" = 'en-IN',
        "acceptedCurrencies" = '[\"INR\"]'::jsonb
      WHERE "id" = 'default'
    `);

    await queryRunner.query(`
      UPDATE "invoices"
      SET "snapshot" = jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              "snapshot",
              '{supplier,legalEntityName}',
              '"Shree Khatu Shyam Health Care"'::jsonb, true
            ),
            '{supplier,address}',
            '"99, Nimera, Jaipur, Rajasthan, India 303005"'::jsonb, true
          ),
          '{supplier,state}',
          '"Rajasthan"'::jsonb, true
        ),
        '{supplier,stateCode}',
        '"08"'::jsonb, true
      )
      WHERE "snapshot"->'supplier'->>'legalEntityName' = 'Hue Muse Beauty'
         OR "snapshot"->'supplier'->>'address' ILIKE '%Austin%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The previous supplier identity was incorrect and must not be restored.
  }
}
