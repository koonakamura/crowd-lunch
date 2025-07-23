const API_BASE_URL = (import.meta.env as { VITE_API_URL?: string }).VITE_API_URL || 'https://crowd-lunch.fly.dev';

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

  async createGuestOrder(order: {
    serve_date: string;
    delivery_type: 'pickup' | 'desk';
    request_time?: string;
    customer_name: string;
    items: OrderItem[];
  }): Promise<Order> {
    const response = await fetch(`${API_BASE_URL}/orders/guest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    return response.json();
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
    return this.request(`/admin/orders?date_filter=${date}`);
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
  }): Promise<MenuSQLAlchemy> {
    return this.request(`/menus/${menuId}`, {
      method: 'PUT',
      body: JSON.stringify(menu),
    });
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
  }, image?: File | null): Promise<MenuSQLAlchemy> {
    const formData = new FormData();
    formData.append('serve_date', menu.serve_date);
    formData.append('title', menu.title);
    formData.append('price', menu.price.toString());
    formData.append('max_qty', menu.max_qty.toString());
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
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async updateMenuSQLAlchemyWithImage(menuId: number, menu: {
    title?: string;
    price?: number;
    max_qty?: number;
  }, image?: File | null): Promise<MenuSQLAlchemy> {
    const formData = new FormData();
    if (menu.title !== undefined) formData.append('title', menu.title);
    if (menu.price !== undefined) formData.append('price', menu.price.toString());
    if (menu.max_qty !== undefined) formData.append('max_qty', menu.max_qty.toString());
    if (image) {
      formData.append('image', image);
    }

    const response = await fetch(`${API_BASE_URL}/menus/${menuId}`, {
      method: 'PUT',
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
}

export interface MenuSQLAlchemy {
  id: number;
  serve_date: string;
  title: string;
  price: number;
  max_qty: number;
  img_url?: string;
  created_at: string;
}

export const apiClient = new ApiClient();
