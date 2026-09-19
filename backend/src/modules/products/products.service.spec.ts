import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { OptimisticLockVersionMismatchError } from "typeorm";
import { ProductsService } from "./products.service";
import { ProductEntity } from "./entities/product.entity";
import { ProductVariantEntity } from "./entities/product-variant.entity";
import { CacheInvalidationService } from "@/cache/cache-invalidation.service";
import { DomainException } from "@/common/exceptions/domain.exception";
import { CategoriesService } from "@/modules/categories/categories.service";
import { TransactionService } from "@/database/transaction.service";

function createMockRepo() {
  return { findOne: jest.fn(), findOneOrFail: jest.fn(), save: jest.fn((e: unknown) => Promise.resolve(e)), create: jest.fn((e: unknown) => e) };
}

describe("ProductsService — stock adjustment", () => {
  let service: ProductsService;
  let variantRepo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    variantRepo = createMockRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(ProductEntity), useValue: createMockRepo() },
        { provide: getRepositoryToken(ProductVariantEntity), useValue: variantRepo },
        { provide: CacheInvalidationService, useValue: { invalidatePrefix: jest.fn() } },
        { provide: CategoriesService, useValue: {} },
        { provide: TransactionService, useValue: { runInTransaction: jest.fn(async (work: (qr: unknown) => Promise<unknown>) => work({ manager: variantRepo })) } },
      ],
    }).compile();
    service = module.get(ProductsService);
  });

  it("decrements stock and recomputes stockState", async () => {
    variantRepo.findOneOrFail.mockResolvedValue({ id: "v1", sku: "SKU-1", stockQuantity: 15, stockState: "in-stock" });
    const result = await service.adjustStock("v1", -10);
    expect(result.stockQuantity).toBe(5);
    expect(result.stockState).toBe("low-stock");
  });

  it("transitions to out-of-stock at zero", async () => {
    variantRepo.findOneOrFail.mockResolvedValue({ id: "v1", sku: "SKU-1", stockQuantity: 3, stockState: "low-stock" });
    const result = await service.adjustStock("v1", -3);
    expect(result.stockQuantity).toBe(0);
    expect(result.stockState).toBe("out-of-stock");
  });

  it("rejects a decrement that would go negative (insufficient stock)", async () => {
    variantRepo.findOneOrFail.mockResolvedValue({ id: "v1", sku: "SKU-1", stockQuantity: 2, stockState: "low-stock" });
    await expect(service.adjustStock("v1", -5)).rejects.toThrow(DomainException);
  });

  it("translates a concurrent-write conflict into a DomainException", async () => {
    variantRepo.findOneOrFail.mockResolvedValue({ id: "v1", sku: "SKU-1", stockQuantity: 10, stockState: "in-stock" });
    variantRepo.save.mockRejectedValue(new OptimisticLockVersionMismatchError("ProductVariantEntity", 1, 2));
    await expect(service.adjustStock("v1", -1)).rejects.toThrow(DomainException);
  });

  it("allows a positive delta (stock restoration, e.g. order cancellation)", async () => {
    variantRepo.findOneOrFail.mockResolvedValue({ id: "v1", sku: "SKU-1", stockQuantity: 0, stockState: "out-of-stock" });
    const result = await service.adjustStock("v1", 5);
    expect(result.stockQuantity).toBe(5);
    expect(result.stockState).toBe("low-stock");
  });
});

describe("ProductsService — product upsert variant persistence", () => {
  it("updates an existing variant instead of silently ignoring it", async () => {
    const productRepo = createMockRepo();
    const variantRepo = createMockRepo();
    const cache = { invalidatePrefix: jest.fn() };
    const existingVariant = { id: "v1", sku: "SKU-1", name: "Old Shade", hexColor: "#000000", stockQuantity: 2, stockState: "low-stock" };
    const existingProduct = { id: "p1", slug: "test-product", variants: [existingVariant] };

    productRepo.findOne.mockResolvedValue(existingProduct);
    variantRepo.findOne.mockResolvedValue(null);
    variantRepo.save.mockImplementation((e: unknown) => Promise.resolve(e));

    const manager = {
      getRepository: jest.fn((entity: unknown) => entity === ProductEntity ? productRepo : variantRepo),
    };

    const service = new ProductsService(productRepo as never, variantRepo as never, cache as never, {} as CategoriesService, {
      runInTransaction: jest.fn(async (work: (qr: unknown) => Promise<unknown>) => work({ manager })),
    } as never);

    await service.upsertFullProduct({
      slug: "test-product",
      name: "Test Product",
      category: { id: "c1" } as never,
      price: 250,
      description: "Test",
      content: {
        shortDescription: "Test",
        keyBenefits: [],
        features: [],
        ingredients: "Test",
        usageInstructions: [],
        warnings: "",
        storageInstructions: "",
        specifications: {},
        faqs: [],
      },
      metaTitle: "Test",
      metaDescription: "Test",
      mediaUrls: [],
      variants: [{ sku: "SKU-1", name: "New Shade", hexColor: "#ffffff", stockQuantity: 20 }],
    });

    expect(existingVariant.name).toBe("New Shade");
    expect(existingVariant.hexColor).toBe("#ffffff");
    expect(existingVariant.stockQuantity).toBe(20);
    expect(existingVariant.stockState).toBe("in-stock");
    expect(variantRepo.save).toHaveBeenCalledWith(existingVariant);
  });

  it("updates an existing variant by id when its SKU is renamed", async () => {
    const productRepo = createMockRepo();
    const variantRepo = createMockRepo();
    const cache = { invalidatePrefix: jest.fn() };
    const existingVariant = { id: "v1", sku: "OLD-SKU", name: "Old", stockQuantity: 4, stockState: "low-stock" };
    const lockedProduct = { id: "p1", slug: "product", variants: [existingVariant] };

    productRepo.findOne.mockResolvedValue(lockedProduct);
    productRepo.save.mockImplementation((value: unknown) => Promise.resolve(value));
    variantRepo.findOne.mockResolvedValue(existingVariant);
    variantRepo.save.mockImplementation((value: unknown) => Promise.resolve(value));

    const manager = {
      getRepository: jest.fn((entity: unknown) => entity === ProductEntity ? productRepo : variantRepo),
    };
    const service = new ProductsService(productRepo as never, variantRepo as never, cache as never, {} as CategoriesService, {
      runInTransaction: jest.fn(async (work: (qr: unknown) => Promise<unknown>) => work({ manager })),
    } as never);

    await service.updateProductById("p1", {
      slug: "product",
      name: "Product",
      category: { id: "c1" } as never,
      price: 250,
      description: "Test",
      content: {} as never,
      metaTitle: "Product",
      metaDescription: "Product",
      mediaUrls: [],
      variants: [{ id: "v1", sku: "NEW-SKU", name: "New", stockQuantity: 4, mrp: 499 }],
    });

    expect(existingVariant.id).toBe("v1");
    expect(existingVariant.sku).toBe("NEW-SKU");
    expect(variantRepo.save).toHaveBeenCalledWith(existingVariant);
  });

  it("persists GST/HSN/tax-inclusive MRP in the same product transaction", async () => {
    const productRepo = createMockRepo();
    const variantRepo = createMockRepo();
    const cache = { invalidatePrefix: jest.fn() };
    productRepo.findOne.mockResolvedValue(null);
    productRepo.create.mockImplementation((value: unknown) => ({ ...(value as object), id: "p2" }));
    productRepo.save.mockImplementation((value: unknown) => Promise.resolve(value));
    variantRepo.findOne.mockResolvedValue(null);
    variantRepo.create.mockImplementation((value: unknown) => ({ ...(value as object), id: "v2" }));
    variantRepo.save.mockImplementation((value: unknown) => Promise.resolve(value));

    const manager = {
      getRepository: jest.fn((entity: unknown) => entity === ProductEntity ? productRepo : variantRepo),
    };
    const service = new ProductsService(productRepo as never, variantRepo as never, cache as never, {} as CategoriesService, {
      runInTransaction: jest.fn(async (work: (qr: unknown) => Promise<unknown>) => work({ manager })),
    } as never);

    const result = await service.upsertFullProduct({
      slug: "atomic-tax-product",
      name: "Atomic Tax Product",
      category: { id: "c1" } as never,
      price: 250,
      description: "Test",
      content: {
        shortDescription: "Test",
        keyBenefits: [],
        features: [],
        ingredients: "Test",
        usageInstructions: [],
        warnings: "",
        storageInstructions: "",
        specifications: {},
        faqs: [],
      },
      metaTitle: "Atomic Tax Product",
      metaDescription: "Test",
      mediaUrls: [],
      hsnCode: "3304",
      gstRate: 18,
      taxInclusiveMrp: true,
      variants: [{ sku: "SKU-2", name: "Default", stockQuantity: 5, mrp: 499 }],
    });

    expect(result.wasCreated).toBe(true);
    expect((result.entity as ProductEntity).hsnCode).toBe("3304");
    expect((result.entity as ProductEntity).gstRate).toBe("18.00");
    expect((result.entity as ProductEntity).taxInclusiveMrp).toBe(true);
    expect(variantRepo.save).toHaveBeenCalledWith(expect.objectContaining({ mrp: "499" }));
  });

  it("rejects an MRP below the product price", async () => {
    const service = new ProductsService({} as never, {} as never, {} as never, {} as CategoriesService, {} as never);
    expect(() => (service as never as { validateProductInput: (value: unknown) => void }).validateProductInput({
      slug: "invalid-mrp",
      name: "Invalid MRP",
      price: 500,
      mediaUrls: [],
      variants: [{ sku: "SKU-3", name: "Default", stockQuantity: 1, mrp: 499 }],
    })).toThrow(DomainException);
  });
});

describe("ProductsService — pricing invariants", () => {
  it("rejects a product price increase that would leave an existing variant MRP below price", async () => {
    const productRepo = createMockRepo();
    const variantRepo = createMockRepo();
    const cache = { invalidatePrefix: jest.fn() };
    const existingVariant = { id: "v1", sku: "SKU-1", name: "Shade", stockQuantity: 5, stockState: "low-stock", mrp: "300" };
    const lockedProduct = { id: "p1", slug: "product", variants: [existingVariant] };

    productRepo.findOne
      .mockResolvedValueOnce(lockedProduct)
      .mockResolvedValueOnce(lockedProduct);
    const manager = {
      getRepository: jest.fn((entity: unknown) => entity === ProductEntity ? productRepo : variantRepo),
    };
    const service = new ProductsService(productRepo as never, variantRepo as never, cache as never, {} as CategoriesService, {
      runInTransaction: jest.fn(async (work: (qr: unknown) => Promise<unknown>) => work({ manager })),
    } as never);

    await expect(service.updateProductById("p1", {
      slug: "product",
      name: "Product",
      category: { id: "c1" } as never,
      price: 400,
      description: "Test",
      content: {} as never,
      metaTitle: "Product",
      metaDescription: "Product",
      mediaUrls: [],
      variants: [{ id: "v1", sku: "SKU-1", name: "Shade", stockQuantity: 5, mrp: 450 }],
    })).rejects.toThrow(DomainException);
  });

  it("rejects adding a variant whose MRP is below the product price", async () => {
    const productRepo = createMockRepo();
    const variantRepo = createMockRepo();
    productRepo.findOne.mockResolvedValue({ id: "p1", price: "500", variants: [] });
    variantRepo.findOne.mockResolvedValue(null);
    const service = new ProductsService(productRepo as never, variantRepo as never, {} as never, {} as CategoriesService, {} as never);

    await expect(service.addVariant("p1", {
      sku: "SKU-NEW",
      name: "New Shade",
      stockQuantity: 1,
      mrp: 499,
    })).rejects.toThrow(DomainException);
  });
});

