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
    return sessionStorage.getItem('adminToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>).Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        window.location.href = '/login';
        throw new Error('認証が必要です。ログインしてください。');
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

  async getOrdersByDate(date: string): Promise<Order[]> {
    return this.request(`/orders?date=${date}`);
  }

  async getMenusSQLAlchemy(date?: string): Promise<MenuSQLAlchemy[]> {
    const params = date ? `?date=${date}` : '';
    return this.request(`/menus${params}`);
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
        window.location.href = '/login';
        throw new Error('認証が必要です。ログインしてください。');
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

export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  try {
    const body = init.body;
    const hdrs = new Headers(init.headers);
    if (body instanceof FormData) {
      hdrs.delete('Content-Type');
    }
    
    const res = await fetch(input, { ...init, headers: hdrs });
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    if (!res.ok) {
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

export { DIAGNOSTIC_INFO };
