import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProductEntity } from "./entities/product.entity";
import { ProductVariantEntity } from "./entities/product-variant.entity";
import { TransactionService } from "@/database/transaction.service";

@Injectable()
export class ProductTaxService {
  constructor(
    @InjectRepository(ProductEntity) private readonly products: Repository<ProductEntity>,
    @InjectRepository(ProductVariantEntity) private readonly variants: Repository<ProductVariantEntity>,
    private readonly transactions: TransactionService,
  ) {}

  async getTaxConfig(productId: string) {
    const product = await this.products.findOne({ where: { id: productId }, relations: ["variants"] });
    if (!product) throw new NotFoundException("Product not found.");
    return {
      productId: product.id,
      productName: product.name,
      hsnCode: product.hsnCode,
      gstRate: product.gstRate,
      taxInclusiveMrp: product.taxInclusiveMrp,
      variants: product.variants.map((variant) => ({ variantId: variant.id, sku: variant.sku, name: variant.name, mrp: variant.mrp })),
    };
  }

  async updateTaxConfig(productId: string, input: {
    hsnCode?: string | null;
    gstRate?: number | null;
    taxInclusiveMrp?: boolean;
    variants?: Array<{ variantId: string; mrp: number }>;
  }) {
    const product = await this.products.findOne({ where: { id: productId }, relations: ["variants"] });
    if (!product) throw new NotFoundException("Product not found.");

    if (input.gstRate != null && (!Number.isFinite(input.gstRate) || input.gstRate < 0 || input.gstRate > 100)) {
      throw new Error("GST rate must be between 0 and 100 percent.");
    }

    await this.transactions.runInTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      const transactionalProduct = await manager.findOne(ProductEntity, {
        where: { id: productId },
        relations: ["variants"],
      });
      if (!transactionalProduct) throw new NotFoundException("Product not found.");

      if (input.hsnCode !== undefined) transactionalProduct.hsnCode = input.hsnCode?.trim() || undefined;
      if (input.gstRate !== undefined) transactionalProduct.gstRate = input.gstRate == null ? undefined : input.gstRate.toFixed(2);
      if (input.taxInclusiveMrp !== undefined) transactionalProduct.taxInclusiveMrp = input.taxInclusiveMrp;

      if (input.variants) {
        const variantMap = new Map(transactionalProduct.variants.map((variant) => [variant.id, variant]));
        for (const update of input.variants) {
          if (!Number.isFinite(update.mrp) || update.mrp < 0) throw new Error("MRP must be a non-negative number.");
          const variant = variantMap.get(update.variantId);
          if (!variant) throw new NotFoundException(`Variant ${update.variantId} not found for product.`);
          variant.mrp = update.mrp.toFixed(2);
        }
        await manager.save([...variantMap.values()]);
      }

      await manager.save(transactionalProduct);
    });
    const updated = await this.products.findOne({ where: { id: productId }, relations: ["variants"] });
    if (!updated) throw new NotFoundException("Product not found.");
    return {
      productId: updated.id,
      hsnCode: updated.hsnCode,
      gstRate: updated.gstRate,
      taxInclusiveMrp: updated.taxInclusiveMrp,
      variants: updated.variants.map((variant) => ({ variantId: variant.id, sku: variant.sku, mrp: variant.mrp })),
    };
  }
}
