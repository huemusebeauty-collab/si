import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";
import { getAllCategories, getAllCollections, getAllProducts } from "@/services/api/products";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, collections, products] = await Promise.all([
    getAllCategories(),
    getAllCollections(),
    getAllProducts(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_CONFIG.url}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_CONFIG.url}/shop`, changeFrequency: "daily", priority: 0.9 },
  ];
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_CONFIG.url}/shop/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));
  const collectionRoutes: MetadataRoute.Sitemap = collections.map((c) => ({
    url: `${SITE_CONFIG.url}/collections/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_CONFIG.url}/products/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...collectionRoutes, ...productRoutes];
}
