function sanitizeApiUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.startsWith('xn--')) {
      console.warn(`Punycode domain detected: ${urlObj.hostname}, falling back to direct API host`);
      return 'https://crowd-lunch.fly.dev';
    }
    return url;
  } catch {
    return 'https://crowd-lunch.fly.dev';
  }
}

const RAW_API_BASE_URL = (import.meta.env as { VITE_API_BASE_URL?: string }).VITE_API_BASE_URL || 'https://crowd-lunch.fly.dev';
const API_BASE_URL = sanitizeApiUrl(RAW_API_BASE_URL);

const DIAGNOSTIC_INFO = {
  API_BASE_URL: API_BASE_URL,
  RAW_API_BASE_URL: RAW_API_BASE_URL,
  APP_COMMIT_SHA: (import.meta.env as { VITE_APP_COMMIT_SHA?: string }).VITE_APP_COMMIT_SHA || 'unknown',
  APP_BUILD_TIME: (import.meta.env as { VITE_APP_BUILD_TIME?: string }).VITE_APP_BUILD_TIME || new Date().toISOString(),
  ENVIRONMENT: (import.meta.env as { MODE?: string }).MODE || 'development'
};

console.log('=== API CLIENT DIAGNOSTIC INFO ===', DIAGNOSTIC_INFO);

const performConnectivityCheck = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/server-time`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (response.ok) {
      console.log('✅ API connectivity verified');
    } else {
      console.warn('⚠️ API connectivity issue:', response.status);
    }
  } catch (error) {
    console.error('❌ API connectivity failed:', error);
  }
};

performConnectivityCheck();

export interface User {
  id: number;
  name: string;
  email: string;
  seat_id?: string;
  created_at: string;
}

export interface Menu {
  id: number;
  serve_date: string;
  title: string;
  price: number;
  max_qty: number;
  img_url?: string;
  cafe_time_available: boolean;
  created_at: string;
  remaining_qty?: number;
}

export interface MenuResponse {
  id: number;
  date: string;
  title: string;
  photo_url?: string;
  items: MenuItemResponse[];
}

export interface MenuItemResponse {
  id: number;
  menu_id: number;
  name: string;
  price: number;
  stock: number;
}

export interface OrderItem {
  menu_id: number;
  qty: number;
  menu_item_name?: string;
}

export interface Order {
  id: number;
  user_id: number;
  serve_date: string;
  delivery_type: 'pickup' | 'desk';
  request_time?: string;
  total_price: number;
  status: 'new' | 'paid' | 'preparing' | 'ready' | 'delivered';
  created_at: string;
  user: User;
  order_items: Array<{
    id: number;
    menu_id: number;
    qty: number;
    menu: Menu;
    menu_item_name?: string;
  }>;
  order_id?: string;
  department?: string;
  customer_name?: string;
  delivery_location?: string;
  delivered_at?: string;
  note?: string;
}

export interface WeeklyMenuResponse {
  date: string;
  menus: Menu[];
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token') || sessionStorage.getItem('adminToken');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  setAdminToken(token: string) {
    this.token = token;
    sessionStorage.setItem('adminToken', token);
    localStorage.removeItem('adminToken');
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('adminToken');
  }

  getAdminToken(): string | null {
    const token = sessionStorage.getItem('adminToken');
    if (!token || token === 'null' || token === 'undefined' || token === '') {
      return null;
    }
    if (!token.match(/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/)) {
      return null;
    }
    return token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const isServerTime = endpoint === '/server-time';
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token && !isServerTime) {
      (headers as Record<string, string>).Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        if (location.pathname.startsWith('/admin')) {
          location.replace('/admin');
          throw new Error('UNAUTHORIZED_REDIRECT');
        } else {
          window.location.href = '/login';
          throw new Error('認証が必要です。ログインしてください。');
        }
      }
      
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      let errorCode = null;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.detail && typeof errorJson.detail === 'object' && errorJson.detail.code) {
          errorCode = errorJson.detail.code;
          errorMessage = errorJson.detail.message || errorMessage;
        } else {
          errorMessage = errorJson.detail || errorMessage;
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      const error = new Error(errorMessage) as Error & { code?: string };
      if (errorCode) {
        error.code = errorCode;
      }
      throw error;
    }

    return response.json();
  }

  async login(email: string): Promise<{ access_token: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  adminLogin(): void {
    const state = crypto.getRandomValues(new Uint8Array(32))
      .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    
    sessionStorage.setItem('auth_state', state);
    
    const redirectUri = `${window.location.origin}/admin/callback`;
    const authUrl = `${API_BASE_URL}/auth/login?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    window.location.assign(authUrl);
  }

  async getWeeklyMenus(date?: string): Promise<WeeklyMenuResponse[]> {
    const currentDate = date || new Date().toISOString().split('T')[0];
    return this.request(`/weekly-menus?date=${currentDate}`);
  }

  async createOrder(order: {
    serve_date: string;
    delivery_type: 'pickup' | 'desk';
    request_time?: string;
    items: OrderItem[];
    pickup_at?: string;
  }): Promise<Order> {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async createGuestOrder(order: {
    serve_date: string;
    delivery_type: 'pickup' | 'desk';
    request_time?: string;
    delivery_location?: string;
    department: string;
    name: string;
    items: OrderItem[];
    pickup_at?: string;
    note?: string;
  }): Promise<Order> {
    return this.request('/orders/guest', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async getOrder(orderId: number): Promise<Order> {
    return this.request(`/orders/${orderId}`);
  }

  async updateOrderStatus(orderId: number, status: string): Promise<Order> {
    return this.request(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async toggleDeliveryCompletion(orderId: number): Promise<Order> {
    return this.request(`/admin/orders/${orderId}/delivery-completion`, {
      method: 'PATCH',
    });
  }

  async getTodayOrders(): Promise<Order[]> {
    return this.request('/admin/orders/today');
  }

  async getMenus(dateFilter?: string): Promise<MenuResponse[]> {
    const params = dateFilter ? `?date_filter=${dateFilter}` : '';
    return this.request(`/admin/menus${params}`);
  }

  async createMenu(menu: { date: string; title: string; photo_url?: string }): Promise<MenuResponse> {
    return this.request('/admin/menus', {
      method: 'POST',
      body: JSON.stringify(menu),
    });
  }

  async updateMenu(menuId: number, menu: { title?: string; photo_url?: string }): Promise<MenuResponse> {
    return this.request(`/admin/menus/${menuId}`, {
      method: 'PATCH',
      body: JSON.stringify(menu),
    });
  }

  async deleteMenu(menuId: number): Promise<void> {
    return this.request(`/admin/menus/${menuId}`, {
      method: 'DELETE',
    });
  }

  async createMenuItem(menuId: number, item: { name: string; price: number; stock: number }): Promise<MenuItemResponse> {
    return this.request(`/admin/menus/${menuId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateMenuItem(itemId: number, item: { name?: string; price?: number; stock?: number }): Promise<MenuItemResponse> {
    return this.request(`/admin/menu-items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(item),
    });
  }

  async deleteMenuItem(itemId: number): Promise<void> {
    return this.request(`/admin/menu-items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async uploadImage(file: File): Promise<{ file_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/admin/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getOrdersByDate(date: string, status?: string): Promise<Order[]> {
    const params = status ? `?date=${date}&status=${status}` : `?date=${date}`;
    return this.request(`/orders${params}`);
  }

  async getMenusSQLAlchemy(date?: string): Promise<MenuSQLAlchemy[]> {
    const params = date ? `?date=${date}` : '';
    return this.request(`/menus${params}`);
  }

  async getPublicMenusSQLAlchemy(date?: string): Promise<MenuSQLAlchemy[]> {
    const params = date ? `?date=${date}` : '';
    return this.request(`/public/menus${params}`);
  }

  async getPublicMenusRange(startDate: string, endDate: string): Promise<{
    range: { start: string; end: string; tz: string };
    days: Record<string, MenuSQLAlchemy[]>;
  }> {
    return this.request(`/public/menus-range?start=${startDate}&end=${endDate}`);
  }

  async createMenuSQLAlchemy(menu: {
    serve_date: string;
    title: string;
    price: number;
    max_qty: number;
    img_url?: string;
    cafe_time_available?: boolean;
  }): Promise<MenuSQLAlchemy> {
    return this.request('/menus', {
      method: 'POST',
      body: JSON.stringify(menu),
    });
  }

  async updateMenuSQLAlchemy(menuId: number, menu: {
    title?: string;
    price?: number;
    max_qty?: number;
    img_url?: string;
    cafe_time_available?: boolean;
  }): Promise<MenuSQLAlchemy> {
    console.log(`🔄 Updating menu ${menuId}:`, menu);
    console.log(`📡 Request URL: ${API_BASE_URL}/menus/${menuId}`);
    
    try {
      const result = await this.request<MenuSQLAlchemy>(`/menus/${menuId}`, {
        method: 'PUT',
        body: JSON.stringify(menu),
      });
      console.log(`✅ Menu ${menuId} updated successfully:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Menu ${menuId} update failed:`, error);
      throw error;
    }
  }

  async deleteMenuSQLAlchemy(menuId: number): Promise<void> {
    return this.request(`/menus/${menuId}`, {
      method: 'DELETE',
    });
  }

  async uploadBackgroundImage(date: string, file: File): Promise<{ img_url: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/menus/background?date=${date}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async createMenuSQLAlchemyWithImage(menu: {
    serve_date: string;
    title: string;
    price: number;
    max_qty: number;
    cafe_time_available?: boolean;
  }, image?: File | null): Promise<MenuSQLAlchemy> {
    const formData = new FormData();
    formData.append('serve_date', menu.serve_date);
    formData.append('title', menu.title);
    formData.append('price', menu.price.toString());
    formData.append('max_qty', menu.max_qty.toString());
    formData.append('cafe_time_available', (menu.cafe_time_available || false).toString());
    if (image) {
      formData.append('image', image);
    }

    const response = await fetch(`${API_BASE_URL}/menus`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async updateMenuSQLAlchemyWithImage(menuId: number, menu: {
    title?: string;
    price?: number;
    max_qty?: number;
    cafe_time_available?: boolean;
  }, image?: File | null): Promise<MenuSQLAlchemy> {
    if (!image) {
      return this.request(`/menus/${menuId}`, {
        method: 'PUT',
        body: JSON.stringify(menu),
      });
    }

    const formData = new FormData();
    if (menu.title !== undefined) formData.append('title', menu.title);
    if (menu.price !== undefined) formData.append('price', menu.price.toString());
    if (menu.max_qty !== undefined) formData.append('max_qty', menu.max_qty.toString());
    if (menu.cafe_time_available !== undefined) formData.append('cafe_time_available', menu.cafe_time_available.toString());
    formData.append('image', image);

    const response = await fetch(`${API_BASE_URL}/menus/${menuId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        if (location.pathname.startsWith('/admin')) {
          location.replace('/admin');
          throw new Error('UNAUTHORIZED_REDIRECT');
        } else {
          window.location.href = '/login';
          throw new Error('認証が必要です。ログインしてください。');
        }
      }
      
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getServerTime(): Promise<{ current_time: string; timezone: string }> {
    return this.request('/server-time');
  }

  // ===== Phase 1/2: 新カタログAPI (/admin/catalog, /v2) =====
  async catListCategories(): Promise<CatCategory[]> {
    return this.request('/admin/catalog/categories');
  }
  async catCreateCategory(body: { name: string; kind?: string; sort_order?: number }): Promise<CatCategory> {
    return this.request('/admin/catalog/categories', { method: 'POST', body: JSON.stringify(body) });
  }
  async catListProducts(): Promise<CatProduct[]> {
    return this.request('/admin/catalog/products');
  }
  async catCreateProduct(body: { category_id?: number | null; name: string; description?: string | null; base_price?: number; image_url?: string | null; is_active?: boolean }): Promise<CatProduct> {
    return this.request('/admin/catalog/products', { method: 'POST', body: JSON.stringify(body) });
  }
  async catUpdateProduct(id: number, body: { category_id?: number | null; name: string; description?: string | null; base_price?: number; image_url?: string | null; is_active?: boolean }): Promise<CatProduct> {
    return this.request(`/admin/catalog/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  }
  async catDeleteProduct(id: number): Promise<{ ok: boolean }> {
    return this.request(`/admin/catalog/products/${id}`, { method: 'DELETE' });
  }
  async catListDailyMenus(date: string): Promise<CatDailyMenu[]> {
    return this.request(`/admin/catalog/daily-menus?date=${date}`);
  }
  async catCreateDailyMenu(body: { serve_date: string; product_id: number; price_override?: number | null; max_qty?: number; sort_order?: number; is_available?: boolean; cafe_time_available?: boolean }): Promise<CatDailyMenu> {
    return this.request('/admin/catalog/daily-menus', { method: 'POST', body: JSON.stringify(body) });
  }
  async catUpdateDailyMenu(id: number, body: { price_override?: number | null; max_qty?: number; sort_order?: number; is_available?: boolean; cafe_time_available?: boolean }): Promise<CatDailyMenu> {
    return this.request(`/admin/catalog/daily-menus/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  }
  async catDeleteDailyMenu(id: number): Promise<{ ok: boolean }> {
    return this.request(`/admin/catalog/daily-menus/${id}`, { method: 'DELETE' });
  }
  async catCreateOptionGroup(body: { product_id?: number | null; name: string; min_select?: number; max_select?: number; is_required?: boolean; sort_order?: number }): Promise<CatOptionGroup> {
    return this.request('/admin/catalog/option-groups', { method: 'POST', body: JSON.stringify(body) });
  }
  async catDeleteOptionGroup(id: number): Promise<{ ok: boolean }> {
    return this.request(`/admin/catalog/option-groups/${id}`, { method: 'DELETE' });
  }
  async catCreateOption(body: { option_group_id: number; name: string; price_delta?: number; sort_order?: number }): Promise<CatOption> {
    return this.request('/admin/catalog/options', { method: 'POST', body: JSON.stringify(body) });
  }
  async catDeleteOption(id: number): Promise<{ ok: boolean }> {
    return this.request(`/admin/catalog/options/${id}`, { method: 'DELETE' });
  }
  async catListTemplates(): Promise<CatTemplate[]> {
    return this.request('/admin/catalog/templates');
  }
  async catCreateTemplate(body: { name: string; weekday?: number | null; note?: string | null; items: Array<{ product_id: number; price_override?: number | null; max_qty?: number; sort_order?: number }> }): Promise<CatTemplate> {
    return this.request('/admin/catalog/templates', { method: 'POST', body: JSON.stringify(body) });
  }
  async catDeleteTemplate(id: number): Promise<{ ok: boolean }> {
    return this.request(`/admin/catalog/templates/${id}`, { method: 'DELETE' });
  }
  async catApplyTemplate(id: number, date: string, replace = false): Promise<CatDailyMenu[]> {
    return this.request(`/admin/catalog/templates/${id}/apply?date=${date}&replace=${replace}`, { method: 'POST' });
  }

  // ----- media library / day settings -----
  async catListMedia(): Promise<CatMediaAsset[]> {
    return this.request('/admin/catalog/media');
  }
  async catUploadMedia(file: File): Promise<CatMediaAsset> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE_URL}/admin/catalog/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    });
    if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
    return res.json();
  }
  async catDeleteMedia(id: number): Promise<{ ok: boolean }> {
    return this.request(`/admin/catalog/media/${id}`, { method: 'DELETE' });
  }
  async catGetDaySetting(date: string): Promise<CatDaySetting> {
    return this.request(`/admin/catalog/day-settings?date=${date}`);
  }
  async catSetDaySetting(date: string, hero_image_id: number | null): Promise<CatDaySetting> {
    return this.request(`/admin/catalog/day-settings?date=${date}`, { method: 'PUT', body: JSON.stringify({ hero_image_id }) });
  }
}

export interface MenuSQLAlchemy {
  id: number;
  serve_date: string;
  title: string;
  price: number;
  max_qty: number;
  img_url?: string;
  cafe_time_available: boolean;
  created_at: string;
}

// ===== Phase 1/2: 新カタログモデル =====
export interface CatCategory {
  id: number;
  name: string;
  kind: string;
  sort_order: number;
  is_active: boolean;
}

export interface CatOption {
  id: number;
  option_group_id: number;
  name: string;
  price_delta: number;
  sort_order: number;
  is_active: boolean;
}

export interface CatOptionGroup {
  id: number;
  product_id: number | null;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  sort_order: number;
  options: CatOption[];
}

export interface CatProduct {
  id: number;
  category_id: number | null;
  name: string;
  description?: string | null;
  base_price: number;
  image_url?: string | null;
  is_active: boolean;
  option_groups: CatOptionGroup[];
}

export interface CatDailyMenu {
  id: number;
  serve_date: string;
  product_id: number;
  price_override: number | null;
  max_qty: number;
  sort_order: number;
  is_available: boolean;
  cafe_time_available: boolean;
  product: CatProduct;
}

export interface CatTemplateItem {
  id: number;
  product_id: number;
  price_override: number | null;
  max_qty: number;
  sort_order: number;
}

export interface CatTemplate {
  id: number;
  name: string;
  weekday: number | null;
  note?: string | null;
  items: CatTemplateItem[];
}

export interface CatMediaAsset {
  id: number;
  url: string;
  filename?: string | null;
  label?: string | null;
  kind: string;
  is_active: boolean;
}

export interface CatDaySetting {
  serve_date: string;
  hero_image_id?: number | null;
  hero_image_url?: string | null;
  banner_text?: string | null;
}

/**
 * API fetch wrapper with 401 error handling
 * 
 * @note For Sentry/error monitoring: Filter out 'UNAUTHORIZED_REDIRECT' errors
 * as they are intentional redirects, not actual application errors
 */
export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  try {
    const res = await fetch(input, init);
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    if (!res.ok) {
      if (res.status === 401 && location.pathname.startsWith('/admin')) {
        try {
          const data = await res.clone().json();
          const code = data?.detail?.code;
          if (code === 'token_expired' || code === 'invalid_token') {
            sessionStorage.removeItem('adminToken');
            sessionStorage.setItem('admin-logout-reason', 'expired');
            location.replace('/admin');
            throw new Error('UNAUTHORIZED_REDIRECT');
          }
        } catch {
          sessionStorage.removeItem('adminToken');
          sessionStorage.setItem('admin-logout-reason', 'unauthorized');
          location.replace('/admin');
          throw new Error('UNAUTHORIZED_REDIRECT');
        }
      }
      const body = isJson ? await res.json().catch(() => ({})) : { message: await res.text().catch(() => "") };
      throw {
        status: res.status,
        code: body?.code || "unknown_error",
        message: body?.message || body?.detail || body?.code || "リクエストに失敗しました",
        raw: body,
      };
    }
    return isJson ? res.json() : {};
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'TypeError' && error.message.includes('fetch')) {
      throw {
        status: 0,
        code: "network_error",
        message: "通信エラーまたはCORSエラーが発生しました",
        raw: error,
      };
    }
    throw error;
  }
}

export const apiClient = new ApiClient();

export { DIAGNOSTIC_INFO, API_BASE_URL };

/** メディアの相対URL(/media/..)をAPIの絶対URLに変換 */
export function mediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
}
