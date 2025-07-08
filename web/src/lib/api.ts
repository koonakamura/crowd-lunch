const API_BASE_URL = (import.meta.env as { VITE_API_URL?: string }).VITE_API_URL || 'https://app-toquofbw.fly.dev';

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
  created_at: string;
  remaining_qty?: number;
}

export interface OrderItem {
  menu_id: number;
  qty: number;
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
  }>;
}

export interface WeeklyMenuResponse {
  date: string;
  menus: Menu[];
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
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
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async login(email: string): Promise<{ access_token: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async getWeeklyMenus(): Promise<WeeklyMenuResponse[]> {
    return this.request('/menus/weekly');
  }

  async createOrder(order: {
    serve_date: string;
    delivery_type: 'pickup' | 'desk';
    request_time?: string;
    items: OrderItem[];
  }): Promise<Order> {
    return this.request('/orders', {
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

  async getTodayOrders(): Promise<Order[]> {
    return this.request('/admin/orders/today');
  }
}

export const apiClient = new ApiClient();
