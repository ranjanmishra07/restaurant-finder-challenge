export interface TokenRequest {
  role?: string;
}

export interface TokenResponse {
  token: string;
  role: string;
}
