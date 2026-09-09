import { ProductConversionService } from "./product-conversion.service";

describe("ProductConversionService", () => {
  it("classifies high-view products with weak cart conversion", async () => {
    const queryBuilder: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { productId: "p1", views: "100", carts: "1", purchases: "0" },
      ]),
    };

    const repo: any = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) };
    const service = new ProductConversionService(repo);
    const result = await service.getProductConversion(30);

    expect(result[0]).toMatchObject({
      productId: "p1",
      views: 100,
      carts: 1,
      purchases: 0,
      opportunity: "high_view_low_cart",
    });
  });
});
