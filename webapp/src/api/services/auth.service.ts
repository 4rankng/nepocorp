import { apiClient } from '@api/client/apiClient';
import { ApiResponse } from '@api/types';
import { 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenRequest, 
  RefreshTokenResponse, 
  User 
} from '@api/types/auth.types';

class AuthService {
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    
    // Store tokens if login successful
    if (response.status === 'success' && response.data) {
      this.storeTokens(response.data.access_token, response.data.refresh_token);
      this.storeUser(response.data.user);
    }
    
    return response;
  }

  async refreshToken(request: RefreshTokenRequest): Promise<ApiResponse<RefreshTokenResponse>> {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', request);
    
    // Update tokens if refresh successful
    if (response.status === 'success' && response.data) {
      this.storeTokens(response.data.access_token, response.data.refresh_token);
    }
    
    return response;
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/auth/profile');
  }

  async logout(): Promise<void> {
    this.clearAuthData();
  }

  // Token management methods
  private storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('authToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private storeUser(user: User): void {
    localStorage.setItem('auth', JSON.stringify(user));
  }

  private clearAuthData(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('auth');
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('auth');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }
}

export const authService = new AuthService();