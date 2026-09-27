// Admin API client — the only admin frontend boundary to the backend.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class AdminApiError extends Error {
  constructor(public readonly status: number, public readonly errorCode: string, message: string) { super(message); }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("hmb_admin_token");
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("hmb_admin_token", token);
  else window.localStorage.removeItem("hmb_admin_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ errorCode: "UNKNOWN", message: response.statusText }));
    throw new AdminApiError(response.status, body.errorCode ?? "UNKNOWN", body.message ?? "Request failed.");
  }
  const envelope = await response.json();
  return envelope.data as T;
}

export const adminApi = {
  login: (email: string, password: string) => request<{ sessionToken: string; role: string; expiresAt: string }>("/admin/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  sendOtp: (phoneNumber: string) => request<{ sent: true; devOtp?: string }>("/admin/auth/otp/send", { method: "POST", body: JSON.stringify({ phoneNumber }) }),
  verifyOtp: (phoneNumber: string, code: string) => request<{ sessionToken: string; role: string; expiresAt: string }>("/admin/auth/otp/verify", { method: "POST", body: JSON.stringify({ phoneNumber, code }) }),
  requestPasswordReset: (email: string, phoneNumber: string) => request<{ sent: true; phoneNumber: string; resetToken: string; devOtp?: string }>("/admin/auth/password/reset/request", { method: "POST", body: JSON.stringify({ email, phoneNumber }) }),
  confirmPasswordReset: (resetToken: string, code: string, newPassword: string) => request<{ reset: true }>("/admin/auth/password/reset/confirm", { method: "POST", body: JSON.stringify({ resetToken, code, newPassword }) }),
  getDashboardOverview: () => request<DashboardOverview>("/admin/dashboard/overview"),
  listProducts: (params: URLSearchParams) => request<Paginated<AdminProduct>>(`/products/admin?${params}`),
  createProduct: (body: CreateProductInput) => request<{ entity: AdminProduct; wasCreated: boolean }>("/products/admin", { method: "POST", body: JSON.stringify(body) }),
  getAdminProduct: (id: string) => request<AdminProductDetail>(`/products/admin/${id}`),
  updateProduct: (id: string, body: CreateProductInput) => request<AdminProduct>(`/products/admin/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  getProductTax: (productId: string) => request<ProductTaxConfig>(`/products/admin/${productId}/tax`),
  updateProductTax: (productId: string, body: UpdateProductTaxInput) => request<ProductTaxConfig>(`/products/admin/${productId}/tax`, { method: "PATCH", body: JSON.stringify(body) }),
  activateProduct: (id: string) => request<AdminProduct>(`/products/${id}/activate`, { method: "POST" }),
  deactivateProduct: (id: string) => request<AdminProduct>(`/products/${id}/deactivate`, { method: "POST" }),
  bulkActivateProducts: (productIds: string[]) => request<{ succeeded: string[]; failed: { id: string; reason: string }[] }>("/products/admin/bulk-activate", { method: "POST", body: JSON.stringify({ productIds }) }),
  bulkDeactivateProducts: (productIds: string[]) => request<{ succeeded: string[]; failed: { id: string; reason: string }[] }>("/products/admin/bulk-deactivate", { method: "POST", body: JSON.stringify({ productIds }) }),
  listInventory: () => request<AdminInventoryItem[]>("/products/admin/inventory"),
  setInventoryStock: (variantId: string, quantity: number, expectedVersion: number) => request<AdminInventoryItem>(`/products/admin/inventory/${variantId}`, { method: "PATCH", body: JSON.stringify({ quantity, expectedVersion }) }),
  listCategories: () => request<AdminCategory[]>("/categories"),
  listAdminCategories: () => request<AdminCategory[]>("/categories/admin"),
  createCategory: (body: CreateCategoryInput) => request<AdminCategory>("/categories/admin", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id: string, body: UpdateCategoryInput) => request<AdminCategory>(`/categories/admin/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  setCategoryVisibility: (id: string, visible: boolean) => request<AdminCategory>(`/categories/${id}/visibility`, { method: "PATCH", body: JSON.stringify({ visible }) }),
  setCategoryDisplayOrder: (id: string, displayOrder: number) => request<AdminCategory>(`/categories/${id}/display-order`, { method: "PATCH", body: JSON.stringify({ displayOrder }) }),
  listCollections: () => request<AdminCollection[]>("/collections"),
  listAdminCollections: () => request<AdminCollection[]>("/collections/admin"),
  createCollection: (body: CreateCollectionInput) => request<AdminCollection>("/collections/admin", { method: "POST", body: JSON.stringify(body) }),
  updateCollection: (id: string, body: UpdateCollectionInput) => request<AdminCollection>(`/collections/admin/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCollection: (id: string) => request<{ deleted: true }>(`/collections/admin/${id}`, { method: "DELETE" }),
  setCollectionActive: (id: string, active: boolean) => request<AdminCollection>(`/collections/${id}/active`, { method: "PATCH", body: JSON.stringify({ active }) }),
  assignCollectionProduct: (collectionId: string, productId: string) => request<AdminCollection>(`/collections/${collectionId}/products/${productId}`, { method: "POST" }),
  unassignCollectionProduct: (collectionId: string, productId: string) => request<AdminCollection>(`/collections/${collectionId}/products/${productId}`, { method: "DELETE" }),
  setCollectionFeatured: (id: string, featured: boolean) => request<AdminCollection>(`/collections/${id}/featured`, { method: "PATCH", body: JSON.stringify({ featured }) }),
  listOrders: (params: URLSearchParams) => request<SimpleList<AdminOrder>>(`/orders/admin/search?${params}`),
  getOrder: (id: string) => request<AdminOrder>(`/orders/admin/${id}`),
  getAdminInvoice: (id: string, size = "A4", format = "STANDARD") =>
    request<AdminInvoice>(`/orders/admin/${id}/invoice?size=${encodeURIComponent(size)}&format=${encodeURIComponent(format)}`),
  issueAdminInvoice: (id: string) => request<AdminInvoice>(`/orders/admin/${id}/invoice`, { method: "POST" }),
  createManualBilling: (body: CreateManualBillingInput) => request<AdminInvoice>("/orders/admin/manual", { method: "POST", body: JSON.stringify(body) }),
  updateOrderStatus: (id: string, status: string) => request<AdminOrder>(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  searchCustomers: (params: URLSearchParams) => request<SimpleList<AdminCustomer>>(`/admin/customers?${params}`),
  getCustomer: (id: string) => request<AdminCustomer>(`/admin/customers/${id}`),
  getCustomerOrders: (id: string) => request<AdminOrder[]>(`/orders/admin/customer/${id}`),
  listReviews: (params: URLSearchParams) => request<SimpleList<AdminReview>>(`/reviews/admin/list?${params}`),
  approveReview: (id: string) => request<AdminReview>(`/reviews/${id}/approve`, { method: "POST" }),
  hideReview: (id: string) => request<AdminReview>(`/reviews/${id}/hide`, { method: "POST" }),
  bulkApproveReviews: (reviewIds: string[]) => request<{ succeeded: string[]; failed: { id: string; reason: string }[] }>("/reviews/admin/bulk-approve", { method: "POST", body: JSON.stringify({ reviewIds }) }),
  getPage: (slug: string) => request<AdminPage>(`/cms/pages/${slug}`),
  updatePage: (slug: string, content: string) => request<AdminPage>(`/cms/pages/${slug}`, { method: "PATCH", body: JSON.stringify({ content }) }),
  listBanners: (placement: string) => request<AdminBanner[]>(`/cms/banners?placement=${placement}`),
  createBanner: (body: Record<string, unknown>) => request<AdminBanner>("/cms/banners", { method: "POST", body: JSON.stringify(body) }),
  listFaqs: () => request<AdminFaq[]>("/cms/faqs"),
  upsertFaq: (body: Record<string, unknown>) => request<AdminFaq>("/cms/faqs", { method: "POST", body: JSON.stringify(body) }),
  listCoupons: (params: URLSearchParams) => request<SimpleList<AdminCoupon>>(`/admin/coupons?${params}`),
  createCoupon: (body: Record<string, unknown>) => request<AdminCoupon>("/admin/coupons", { method: "POST", body: JSON.stringify(body) }),
  setCouponActive: (id: string, active: boolean) => request<AdminCoupon>(`/admin/coupons/${id}/active`, { method: "PATCH", body: JSON.stringify({ active }) }),
  getSalesSummary: (params: URLSearchParams) => request<OrdersReport>(`/admin/reports/sales-summary?${params}`),
  getOrdersReport: (params: URLSearchParams) => request<OrdersReport>(`/admin/reports/orders?${params}`),
  getCustomersReport: (params: URLSearchParams) => request<CustomersReport>(`/admin/reports/customers?${params}`),
  getProductsReport: () => request<ProductsReport>("/admin/reports/products"),
  getCouponsReport: () => request<AdminCoupon[]>("/admin/reports/coupons"),
  listAuditLogs: (params: URLSearchParams) => request<Paginated<AuditLogEntry>>(`/admin/audit-logs?${params}`),
  exportProductsCsvUrl: () => `${API_BASE}/admin/products/export`,
  importProductsCsv: (csv: string) => request<{ succeeded: number; failed: { row: number; reason: string }[] }>("/admin/products/import", { method: "POST", body: JSON.stringify({ csv }) }),
  listMedia: (category = "product-media") => request<{ items: AdminMediaItem[] }>(`/storage/media/library?category=${encodeURIComponent(category)}`, { cache: "no-store" }),
  reoptimizeMedia: (category = "product-media") => request<{ category: string; scanned: number; optimized: number; unchanged: number; failed: number; savedBytes: number; results: { key: string; action: string; beforeBytes: number; afterBytes: number; savedBytes: number; savedPercent: number }[] }>(`/storage/media/reoptimize?category=${encodeURIComponent(category)}`, { method: "POST" }),
  getMediaReferences: (key: string, category = "product-media") => request<{ used: boolean; products: { id: string; name: string; slug: string }[] }>(`/storage/media/${encodeURIComponent(category)}/${encodeURIComponent(key.split("/").pop() ?? key)}/references`),
  deleteMedia: (key: string, category = "product-media") => request<{ deleted: true; key: string }>(`/storage/media/${encodeURIComponent(category)}/${encodeURIComponent(key.split("/").pop() ?? key)}`, { method: "DELETE" }),
  uploadMedia: async (file: File, category = "product-media"): Promise<{ key: string; url: string; originalSize: number; storedSize: number; savedBytes: number; savedPercent: number; contentType: string }> => {
    const token = getToken(); const form = new FormData(); form.append("file", file);
    const response = await fetch(`${API_BASE}/storage/upload?category=${encodeURIComponent(category)}`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ errorCode: "UNKNOWN", message: response.statusText }));
      throw new AdminApiError(response.status, body.errorCode ?? "UPLOAD_FAILED", body.message ?? "Upload failed.");
    }
    return (await response.json()).data;
  },
  getIntegrationsStatus: () => request<IntegrationsStatus>("/integrations/status"),
  getDeadLetterJobs: (queueName: string) => request<DeadLetterJob[]>(`/integrations/dead-letter/${queueName}`),
  retryDeadLetterJob: (queueName: string, jobId: string) => request<{ retried: true; queue: string; jobId?: string }>(`/integrations/dead-letter/${encodeURIComponent(queueName)}/${encodeURIComponent(jobId)}/retry`, { method: "POST" }),
  getLogisticsDashboard: () => request<LogisticsDashboard>("/admin/logistics/dashboard"),
  listLogisticsEligibleOrders: (query?: string) => request<LogisticsEligibleOrder[]>(`/admin/logistics/orders${query ? `?q=${encodeURIComponent(query)}` : ""}`),
  listShipments: (status?: string) => request<AdminShipment[]>(`/admin/logistics/shipments${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  getShipment: (id: string) => request<AdminShipment>(`/admin/logistics/shipments/${id}`),
  getShipmentTracking: (id: string) => request<ShipmentEvent[]>(`/admin/logistics/shipments/${id}/tracking`),
  getOrderShipment: (orderId: string) => request<AdminShipment | null>(`/admin/logistics/orders/${orderId}`),
  createShipment: (body: CreateShipmentInput) => request<AdminShipment>("/admin/logistics/shipments", { method: "POST", body: JSON.stringify(body) }),
  updateShipmentStatus: (id: string, body: UpdateShipmentStatusInput) => request<AdminShipment>(`/admin/logistics/shipments/${id}/status`, { method: "PATCH", body: JSON.stringify(body) }),
};

export interface AdminMediaItem { key: string; urlKey: string; url: string; type: "image" | "video"; contentType: string; size: number; originalSize: number | null; savedBytes: number | null; savedPercent: number | null; lastModified: string | null }
export interface CreateProductInput {
  slug: string; name: string; commonName?: string; categorySlug: string; price: number; salePrice?: number; hsnCode?: string; gstRate?: number; taxInclusiveMrp?: boolean; description: string;
  content: { shortDescription: string; keyBenefits: string[]; features: string[]; ingredients: string; usageInstructions: string[]; warnings: string; storageInstructions: string; specifications: Record<string, string>; faqs: { question: string; answer: string }[] };
  metaTitle: string; metaDescription: string; mediaUrls: string[];
  variants: { id?: string; sku: string; name: string; hexColor?: string; stockQuantity: number; mrp?: number }[];
}
export interface UpdateProductTaxInput { hsnCode?: string; gstRate?: number; taxInclusiveMrp?: boolean; variants?: { variantId: string; mrp: number }[] }
export interface ProductTaxConfig { productId: string; productName: string; hsnCode?: string; gstRate?: string; taxInclusiveMrp: boolean; variants: { variantId: string; sku: string; name: string; mrp?: string }[] }
export interface Paginated<T> { items: T[]; meta: { page: number; pageSize: number; totalItems: number; totalPages: number } }
export interface SimpleList<T> { items: T[]; totalItems: number }
export interface DashboardOverview { kpis: { todaysOrders: number; todaysRevenue: number; lowStockCount: number; pendingReviews: number }; pendingTasks: { type: string; count: number; label: string }[]; recentActivity: AuditLogEntry[] }
export interface AdminProduct {
  id: string; slug: string; name: string; commonName?: string; price: string; salePrice?: string; hsnCode?: string; status: string; visibility: string;
  category?: { id?: string; slug?: string; name: string };
  variants?: { id: string; sku: string; name: string; stockQuantity: number; mrp?: string }[];
}
export interface AdminProductDetail extends AdminProduct { salePrice?: string; description?: string; metaTitle?: string; metaDescription?: string; mediaUrls: string[]; content?: CreateProductInput["content"]; hsnCode?: string; gstRate?: string; taxInclusiveMrp: boolean; variants: { id: string; sku: string; name: string; hexColor?: string; stockQuantity: number; mrp?: string }[] }
export interface AdminInventoryItem { id: string; sku: string; name: string; stockQuantity: number; stockState: "in-stock" | "low-stock" | "out-of-stock" | "coming-soon" | "pre-order"; version: number; product: { id: string; name: string; slug: string; category: string } }
export interface CreateCategoryInput { name: string; slug: string; parentId?: string | null; displayOrder?: number; visible?: boolean; metaTitle?: string; metaDescription?: string }
export interface UpdateCategoryInput { name?: string; slug?: string; parentId?: string | null; displayOrder?: number; visible?: boolean; metaTitle?: string; metaDescription?: string }
export interface AdminCategory { id: string; slug: string; name: string; visible: boolean; displayOrder: number; parentId?: string | null; children?: AdminCategory[] }
export interface CreateCollectionInput { slug: string; name: string; tagline?: string; active?: boolean; featured?: boolean; displayOrder?: number; metaTitle?: string; metaDescription?: string; startAt?: string; endAt?: string }
export interface UpdateCollectionInput extends Partial<CreateCollectionInput> {}
export interface AdminCollection { id: string; slug: string; name: string; tagline?: string; active: boolean; featured: boolean; displayOrder: number; metaTitle?: string; metaDescription?: string; startAt?: string; endAt?: string; products?: Array<{ id: string; name: string; slug: string }> }
export interface AdminOrder {
  id: string;
  customerId: string;
  status: string;
  total: string;
  currency: string;
  createdAt: string;
  lineItems?: unknown[];
  customerLegalName?: string;
  customerGstin?: string;
  shippingAddress?: Record<string, unknown>;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    addresses: Array<Record<string, unknown>>;
  };
}
export interface CreateManualBillingInput {
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerGstin?: string;
  billingAddress?: Record<string, unknown>;
  shippingAddress?: Record<string, unknown>;
  items: { variantId: string; quantity: number; unitPrice?: number; discountType?: "percentage" | "amount"; discountValue?: number; discountAmount?: number }[];
  paymentMethod: "cash" | "upi" | "card" | "bank_transfer" | "other";
  paymentReference?: string;
  notes?: string;
}

export interface AdminInvoice {
  orderId: string;
  customerId?: string;
  supplier?: Record<string, unknown>;
  recipient?: Record<string, unknown>;
  shippingAddress?: Record<string, unknown>;
  placeOfSupply?: Record<string, unknown>;
  lineItems: unknown[];
  subtotal: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  logisticsFee?: string;
  platformFee?: string;
  total: string;
  currency: string;
  issuedAt: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  layout: { size: string; format: string; width: string };
}
export interface AdminCustomer { id: string; email: string; firstName: string; lastName: string; phone?: string; gstin?: string; addresses?: Array<{ id?: string; line1: string; line2?: string; city: string; region: string; stateCode?: string; postalCode: string; country: string; isDefault?: boolean }>; createdAt: string }
export interface AdminReview { id: string; customerId: string; variantId: string; rating: number; text: string; status: string; createdAt: string }
export interface AdminPage { slug: string; title: string; content: string }
export interface AdminBanner { id: string; placement: string; imageUrl: string; headline?: string; startAt: string; endAt: string }
export interface AdminFaq { id: string; question: string; answer: string; category?: string }
export interface AdminCoupon { id: string; code: string; discountType: string; discountValue: string; active: boolean; timesRedeemed: number; startAt: string; endAt: string }
export interface OrdersReport { orderCount: number; averageOrderValue: number; totalRevenue: number; statusBreakdown: Record<string, number> }
export interface CustomersReport { newCustomers: number; totalCustomers: number }
export interface ProductsReport { lowestStock: { id: string; sku: string; name: string; stockQuantity: number }[] }
export interface AuditLogEntry { id: string; actorEmail: string; module: string; action: string; entityId?: string; createdAt: string }
export interface CreateShipmentInput { orderId: string; carrier?: string; serviceLevel?: string; weightGrams?: number; lengthCm?: number; widthCm?: number; heightCm?: number; estimatedDeliveryAt?: string }
export interface UpdateShipmentStatusInput { status: string; description?: string; location?: string; awbNumber?: string; trackingUrl?: string; failureReason?: string }
export interface LogisticsEligibleOrder { id: string; customerLegalName?: string; status: string; total: string; createdAt: string }
export interface AdminShipment { id: string; orderId: string; status: string; carrier?: string; serviceLevel?: string; awbNumber?: string; trackingUrl?: string; weightGrams?: number; shippingAddress: Record<string, unknown>; estimatedDeliveryAt?: string; shippedAt?: string; deliveredAt?: string; failureReason?: string; createdAt: string; updatedAt: string }
export interface ShipmentEvent { id: string; shipmentId: string; status: string; description?: string; location?: string; eventAt: string }
export interface LogisticsDashboard { total: number; counts: Record<string, number>; exceptions: number; terminal: number }
export interface IntegrationsStatus { providers: { provider: string; circuitState: string; lastSuccessAt: string | null; lastFailureAt: string | null; lastError: string | null }[]; queues: { name: string; waiting: number; active: number; completed: number; failed: number; delayed: number }[] }
export interface DeadLetterJob { id?: string; name: string; data: unknown; failedReason: string; attemptsMade: number }
