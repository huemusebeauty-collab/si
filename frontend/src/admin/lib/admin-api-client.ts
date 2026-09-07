// Sprint 6B — the ONLY place admin frontend code talks to the backend.
// Per the sprint's own constraint ("Consume existing backend APIs
// only... do not duplicate business logic"), this client does no
// validation, no computation, no state transitions of its own — every
// method is a thin typed wrapper over one backend endpoint documented
// in docs/admin/API_REFERENCE.md.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class AdminApiError extends Error {
  constructor(public readonly status: number, public readonly errorCode: string, message: string) {
    super(message);
  }
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
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ errorCode: "UNKNOWN", message: response.statusText }));
    throw new AdminApiError(response.status, body.errorCode ?? "UNKNOWN", body.message ?? "Request failed.");
  }

  // Sprint 3.6 — every backend response is wrapped in { data, meta }
  // (ResponseEnvelopeInterceptor) — unwrapped here once, so every
  // caller of this client works with plain typed data.
  const envelope = await response.json();
  return envelope.data as T;
}

export const adminApi = {
  // Auth
  login: (email: string, password: string) =>
    request<{ sessionToken: string; role: string; expiresAt: string }>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  sendOtp: (phoneNumber: string) =>
    request<{ sent: true; devOtp?: string }>("/admin/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    }),
  verifyOtp: (phoneNumber: string, code: string) =>
    request<{ sessionToken: string; role: string; expiresAt: string }>("/admin/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, code }),
    }),

  // Dashboard
  getDashboardOverview: () => request<DashboardOverview>("/admin/dashboard/overview"),

  // Products
  listProducts: (params: URLSearchParams) => request<Paginated<AdminProduct>>(`/products?${params}`),
  activateProduct: (id: string) => request<AdminProduct>(`/products/${id}/activate`, { method: "POST" }),
  deactivateProduct: (id: string) => request<AdminProduct>(`/products/${id}/deactivate`, { method: "POST" }),
  bulkActivateProducts: (productIds: string[]) =>
    request<{ succeeded: string[]; failed: { id: string; reason: string }[] }>("/products/admin/bulk-activate", {
      method: "POST",
      body: JSON.stringify({ productIds }),
    }),
  bulkDeactivateProducts: (productIds: string[]) =>
    request<{ succeeded: string[]; failed: { id: string; reason: string }[] }>("/products/admin/bulk-deactivate", {
      method: "POST",
      body: JSON.stringify({ productIds }),
    }),

  // Categories
  listCategories: () => request<AdminCategory[]>("/categories"),
  setCategoryVisibility: (id: string, visible: boolean) =>
    request<AdminCategory>(`/categories/${id}/visibility`, { method: "PATCH", body: JSON.stringify({ visible }) }),
  setCategoryDisplayOrder: (id: string, displayOrder: number) =>
    request<AdminCategory>(`/categories/${id}/display-order`, { method: "PATCH", body: JSON.stringify({ displayOrder }) }),

  // Collections
  listCollections: () => request<AdminCollection[]>("/collections"),
  setCollectionFeatured: (id: string, featured: boolean) =>
    request<AdminCollection>(`/collections/${id}/featured`, { method: "PATCH", body: JSON.stringify({ featured }) }),

  // Orders
  listOrders: (params: URLSearchParams) => request<SimpleList<AdminOrder>>(`/orders/admin/search?${params}`),
  getOrder: (id: string) => request<AdminOrder>(`/orders/${id}`),
  updateOrderStatus: (id: string, status: string) =>
    request<AdminOrder>(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // Customers
  searchCustomers: (params: URLSearchParams) => request<SimpleList<AdminCustomer>>(`/admin/customers?${params}`),
  getCustomer: (id: string) => request<AdminCustomer>(`/admin/customers/${id}`),
  getCustomerOrders: (id: string) => request<AdminOrder[]>(`/orders/admin/customer/${id}`),

  // Reviews
  listReviews: (params: URLSearchParams) => request<SimpleList<AdminReview>>(`/reviews/admin/list?${params}`),
  approveReview: (id: string) => request<AdminReview>(`/reviews/${id}/approve`, { method: "POST" }),
  hideReview: (id: string) => request<AdminReview>(`/reviews/${id}/hide`, { method: "POST" }),
  bulkApproveReviews: (reviewIds: string[]) =>
    request<{ succeeded: string[]; failed: { id: string; reason: string }[] }>("/reviews/admin/bulk-approve", {
      method: "POST",
      body: JSON.stringify({ reviewIds }),
    }),

  // CMS
  getPage: (slug: string) => request<AdminPage>(`/cms/pages/${slug}`),
  updatePage: (slug: string, content: string) =>
    request<AdminPage>(`/cms/pages/${slug}`, { method: "PATCH", body: JSON.stringify({ content }) }),
  listBanners: (placement: string) => request<AdminBanner[]>(`/cms/banners?placement=${placement}`),
  createBanner: (body: Record<string, unknown>) => request<AdminBanner>("/cms/banners", { method: "POST", body: JSON.stringify(body) }),
  listFaqs: () => request<AdminFaq[]>("/cms/faqs"),
  upsertFaq: (body: Record<string, unknown>) => request<AdminFaq>("/cms/faqs", { method: "POST", body: JSON.stringify(body) }),

  // Coupons
  listCoupons: (params: URLSearchParams) => request<SimpleList<AdminCoupon>>(`/admin/coupons?${params}`),
  createCoupon: (body: Record<string, unknown>) => request<AdminCoupon>("/admin/coupons", { method: "POST", body: JSON.stringify(body) }),
  setCouponActive: (id: string, active: boolean) =>
    request<AdminCoupon>(`/admin/coupons/${id}/active`, { method: "PATCH", body: JSON.stringify({ active }) }),

  // Reports
  getSalesSummary: (params: URLSearchParams) => request<OrdersReport>(`/admin/reports/sales-summary?${params}`),
  getOrdersReport: (params: URLSearchParams) => request<OrdersReport>(`/admin/reports/orders?${params}`),
  getCustomersReport: (params: URLSearchParams) => request<CustomersReport>(`/admin/reports/customers?${params}`),
  getProductsReport: () => request<ProductsReport>("/admin/reports/products"),
  getCouponsReport: () => request<AdminCoupon[]>("/admin/reports/coupons"),

  // Audit logs
  listAuditLogs: (params: URLSearchParams) => request<Paginated<AuditLogEntry>>(`/admin/audit-logs?${params}`),

  // Import/Export
  exportProductsCsvUrl: () => `${API_BASE}/admin/products/export`,
  importProductsCsv: (csv: string) => request<{ succeeded: number; failed: { row: number; reason: string }[] }>("/admin/products/import", { method: "POST", body: JSON.stringify({ csv }) }),

  // Media
  uploadMedia: async (file: File): Promise<{ key: string; url: string }> => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${API_BASE}/storage/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!response.ok) throw new AdminApiError(response.status, "UPLOAD_FAILED", "Upload failed.");
    const envelope = await response.json();
    return envelope.data;
  },

  // System monitoring
  getIntegrationsStatus: () => request<IntegrationsStatus>("/integrations/status"),
  getDeadLetterJobs: (queueName: string) => request<DeadLetterJob[]>(`/integrations/dead-letter/${queueName}`),
};

// --- Response shape types (mirror backend DTOs — see docs/admin/API_REFERENCE.md) ---
export interface Paginated<T> { items: T[]; meta: { page: number; pageSize: number; totalItems: number; totalPages: number } }
export interface SimpleList<T> { items: T[]; totalItems: number }
export interface DashboardOverview {
  kpis: { todaysOrders: number; todaysRevenue: number; lowStockCount: number; pendingReviews: number };
  pendingTasks: { type: string; count: number; label: string }[];
  recentActivity: AuditLogEntry[];
}
export interface AdminProduct { id: string; slug: string; name: string; price: string; status: string; visibility: string; category?: { name: string } }
export interface AdminCategory { id: string; slug: string; name: string; visible: boolean; displayOrder: number }
export interface AdminCollection { id: string; slug: string; name: string; active: boolean; featured: boolean; displayOrder: number }
export interface AdminOrder { id: string; customerId: string; status: string; total: string; currency: string; createdAt: string; lineItems?: unknown[] }
export interface AdminCustomer { id: string; email: string; firstName: string; lastName: string; createdAt: string }
export interface AdminReview { id: string; customerId: string; variantId: string; rating: number; text: string; status: string; createdAt: string }
export interface AdminPage { slug: string; title: string; content: string }
export interface AdminBanner { id: string; placement: string; imageUrl: string; headline?: string; startAt: string; endAt: string }
export interface AdminFaq { id: string; question: string; answer: string; category?: string }
export interface AdminCoupon { id: string; code: string; discountType: string; discountValue: string; active: boolean; timesRedeemed: number; startAt: string; endAt: string }
export interface OrdersReport { orderCount: number; averageOrderValue: number; totalRevenue: number; statusBreakdown: Record<string, number> }
export interface CustomersReport { newCustomers: number; totalCustomers: number }
export interface ProductsReport { lowestStock: { id: string; sku: string; name: string; stockQuantity: number }[] }
export interface AuditLogEntry { id: string; actorEmail: string; module: string; action: string; entityId?: string; createdAt: string }
export interface IntegrationsStatus {
  providers: { provider: string; circuitState: string; lastSuccessAt: string | null; lastFailureAt: string | null; lastError: string | null }[];
  queues: { name: string; waiting: number; active: number; completed: number; failed: number; delayed: number }[];
}
export interface DeadLetterJob { id?: string; name: string; data: unknown; failedReason: string; attemptsMade: number }
