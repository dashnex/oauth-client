import { DashNexOauthClient } from '../DashNexOauthClient';

// Mock fetch globally
global.fetch = jest.fn();

describe('DashNexOauthClient', () => {
  let client: DashNexOauthClient;
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/callback',
    baseUrl: 'https://api.dashnex.com'
  };

  beforeEach(() => {
    client = new DashNexOauthClient(mockConfig);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(client).toBeDefined();
    });

    it('should use default baseUrl when not provided', () => {
      const clientWithoutBaseUrl = new DashNexOauthClient({
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/callback'
      });
      expect(clientWithoutBaseUrl).toBeDefined();
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL with required parameters', () => {
      const url = client.getAuthorizationUrl('read write');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=read+write');
      expect(url).toContain('state=');
    });

    it('should include PKCE parameters when no client secret is provided', () => {
      const clientWithoutSecret = new DashNexOauthClient({
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/callback'
      });
      const url = clientWithoutSecret.getAuthorizationUrl();
      expect(url).toContain('code_challenge=');
      expect(url).toContain('code_challenge_method=S256');
    });
  });

  describe('exchangeCodeForToken', () => {
    const mockTokenResponse = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      scope: 'read write',
      token_type: 'Bearer'
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      });
    });

    it('should exchange code for token with client secret', async () => {
      const result = await client.exchangeCodeForToken('test-code');
      expect(result).toEqual(mockTokenResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.dashnex.com/oauth/v2/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'DNX'
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code: 'test-code',
            redirect_uri: 'http://localhost:3000/callback',
            client_id: 'test-client-id',
            client_secret: 'test-client-secret'
          })
        })
      );
    });

    it('should exchange code for token with PKCE', async () => {
      const clientWithoutSecret = new DashNexOauthClient({
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/callback'
      });
      const result = await clientWithoutSecret.exchangeCodeForToken('test-code', 'test-code-verifier');
      expect(result).toEqual(mockTokenResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.dashnex.com/oauth/v2/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'DNX'
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code: 'test-code',
            redirect_uri: 'http://localhost:3000/callback',
            client_id: 'test-client-id',
            code_verifier: 'test-code-verifier'
          })
        })
      );
    });

    it('should throw error when neither client secret nor code verifier is provided', async () => {
      const clientWithoutSecret = new DashNexOauthClient({
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/callback'
      });
      await expect(clientWithoutSecret.exchangeCodeForToken('test-code')).rejects.toThrow(
        'Either client secret or code verifier must be provided'
      );
    });
  });

  describe('refreshAccessToken', () => {
    const mockTokenResponse = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600,
      scope: 'read write',
      token_type: 'Bearer'
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      });
    });

    it('should refresh access token', async () => {
      const result = await client.refreshAccessToken('test-refresh-token');
      expect(result).toEqual(mockTokenResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.dashnex.com/oauth/v2/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'DNX'
          },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: 'test-refresh-token',
            client_id: 'test-client-id',
            client_secret: 'test-client-secret'
          })
        })
      );
    });

    it('should handle refresh token errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Invalid refresh token'
      });

      await expect(client.refreshAccessToken('invalid-token')).rejects.toThrow('Token refresh failed');
    });
  });
}); 