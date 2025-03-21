# DashNex OAuth Client

A TypeScript library for handling OAuth 2.0 authentication with DashNex services. This library supports both traditional OAuth 2.0 with client secrets and PKCE (Proof Key for Code Exchange) flow for enhanced security.

## Features

- OAuth 2.0 Authorization Code Flow
- PKCE (Proof Key for Code Exchange) support
- Token refresh functionality
- Cross-platform base64 encoding
- TypeScript support with type definitions

## Installation

```bash
npm install @dashnex.com/oauth-client
```

## Usage

### Basic Setup

```typescript
import { DashNexOauthClient } from '@dashnex.com/oauth-client';

const client = new DashNexOauthClient({
  clientId: 'your-client-id',
  redirectUri: 'https://your-app.com/callback',
  // Optional: baseUrl if different from default
  baseUrl: 'https://dashnex.com'
});
```

### With Client Secret (Traditional OAuth)

```typescript
const client = new DashNexOauthClient({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'https://your-app.com/callback'
});

// Generate authorization URL, provide scope as optional parameter
const authUrl = client.getAuthorizationUrl();

// Redirect user to authUrl, receive the code from the URL

// After receiving the code in your callback
const token = await client.exchangeCodeForToken(code);

// store the token for further usage
```

### With PKCE (Recommended for Public Clients)

```typescript
const client = new DashNexOauthClient({
  clientId: 'your-client-id',
  redirectUri: 'https://your-app.com/callback'
});

// Generate authorization URL (PKCE will be automatically used)
const authUrl = client.getAuthorizationUrl(); // optionally add the scope as parameter

// Store the code verifier securely (e.g., in session storage)
const codeVerifier = // ... get from storage

// Exchange the code for tokens
const token = await client.exchangeCodeForToken(code, codeVerifier);
// store the token for further usage
```

### Refreshing Tokens

```typescript
// Refresh an expired access token
const newToken = await client.refreshAccessToken(refreshToken);

// store the newToken for further usage
```

## Types

### Configuration

```typescript
type DashNexAuthClientConfig = {
  clientId: string;
  clientSecret?: string;  // Optional
  redirectUri: string;
  baseUrl?: string;      // Optional, defaults to 'https://dashnex.com'
};
```

### Auth Token

```typescript
type AuthToken = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
};
```

## Security Considerations

1. Always use HTTPS in production
2. Store tokens securely
3. Use PKCE flow for public clients (browser-based applications)
4. Keep client secrets secure and never expose them in client-side code
5. Validate state parameters to prevent CSRF attacks

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 