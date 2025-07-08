const API_BASE_URL = 'http://localhost:8000';

export interface User {
  id: string;
  email: string;
  full_name: string;
  company: string;
  position: string;
  role: 'executive' | 'decision_maker' | 'event_organizer' | 'operator';
  industry: string;
  location: string;
  company_size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  bio?: string;
  linkedin_url?: string;
  website_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name: string;
  company: string;
  position: string;
  role: 'executive' | 'decision_maker' | 'event_organizer' | 'operator';
  industry: string;
  location: string;
  company_size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  bio?: string;
  linkedin_url?: string;
  website_url?: string;
  phone?: string;
}

export interface UserUpdate {
  full_name?: string;
  company?: string;
  position?: string;
  role?: 'executive' | 'decision_maker' | 'event_organizer' | 'operator';
  industry?: string;
  location?: string;
  company_size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  bio?: string;
  linkedin_url?: string;
  website_url?: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('access_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async register(userData: UserCreate): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    this.token = response.access_token;
    localStorage.setItem('access_token', this.token);
    return response;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    this.token = response.access_token;
    localStorage.setItem('access_token', this.token);
    return response;
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/users/me');
  }

  async updateProfile(updates: UserUpdate): Promise<User> {
    return this.request<User>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async searchUsers(query?: string, industry?: string, location?: string): Promise<User[]> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (industry) params.append('industry', industry);
    if (location) params.append('location', location);
    
    const endpoint = `/users/search${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<User[]>(endpoint);
  }

  logout() {
    this.token = null;
    localStorage.removeItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const apiClient = new ApiClient();
