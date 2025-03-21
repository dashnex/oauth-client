import { Buffer } from 'buffer';
import { sha256 } from 'sha.js';

export type DashNexAuthClientConfig = {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  baseUrl?: string;
};

export type AuthToken = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export class DashNexOauthClient {
  private clientId: string;
  private clientSecret: string | null;
  private redirectUri: string;
  private baseUrl: string;

  constructor(config: DashNexAuthClientConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret || null;
    this.redirectUri = config.redirectUri;
    this.baseUrl = config.baseUrl || 'https://api.dashnex.com';
  }

  // Generate authorization URL for OAuth flow
  getAuthorizationUrl(scope: string = ''): string {
    // Generate 16 random bytes using custom random generation
    const state = Array(32).fill(0)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('');

    const params: Record<string, string> = {
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope,
      state,
    };

    // Use PKCE if client secret is not provided AND token storage supports code verifier
    if (!this.clientSecret) {
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);

      params.code_challenge = codeChallenge;
      params.code_challenge_method = 'S256';
    }

    return `${this.baseUrl}/oauth/v2/auth?${new URLSearchParams(params).toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<AuthToken> {
    const params: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
    };

    // Only add client secret if provided
    if (this.clientSecret) {
      params.client_secret = this.clientSecret;
    }

    // Add code verifier if available in storage
    if (codeVerifier) {
      params.code_verifier = codeVerifier;
    }

    // Validate we have either client secret or code verifier
    if (!this.clientSecret && !codeVerifier) {
      throw new Error('Either client secret or code verifier must be provided');
    }
    
    const response = await fetch(`${this.baseUrl}/oauth/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DNX'
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Refresh access token using refresh token
  public async refreshAccessToken(refreshToken: string): Promise<AuthToken> {
    const response = await fetch(`${this.baseUrl}/oauth/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DNX'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  }

  // Generate random code verifier for PKCE
  private generateCodeVerifier(): string {
    // Generate 32 random bytes using custom random generation
    const array = new Uint8Array(32);
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return Buffer.from(array)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Generate code challenge from verifier
  private generateCodeChallenge(verifier: string): string {

    const hash = new sha256()
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
      
    return hash;
  }
} 