export interface BasicAuthConfig {
  username: string;
  password: string;
  enabled: boolean;
}

const DEFAULT_BASIC_AUTH: BasicAuthConfig = {
  username: import.meta.env.VITE_BASIC_AUTH_USERNAME || '',
  password: import.meta.env.VITE_BASIC_AUTH_PASSWORD || '',
  enabled: false // Only enabled when deployed publicly
};

export function getBasicAuthConfig(): BasicAuthConfig {
  const isPublicDeployment = window.location.hostname !== 'localhost' && 
                            window.location.hostname !== '127.0.0.1';
  
  const isLocalTesting = window.location.hostname === 'localhost' && 
                         window.location.port === '3000';
  
  return {
    ...DEFAULT_BASIC_AUTH,
    enabled: isPublicDeployment || isLocalTesting
  };
}

export function createBasicAuthHeader(config: BasicAuthConfig): string {
  if (!config.enabled) return '';
  
  const credentials = btoa(`${config.username}:${config.password}`);
  return `Basic ${credentials}`;
}

export function addBasicAuthToFetch(options: RequestInit = {}): RequestInit {
  const config = getBasicAuthConfig();
  
  if (config.enabled) {
    const headers = new Headers(options.headers);
    headers.set('Authorization', createBasicAuthHeader(config));
    
    return {
      ...options,
      headers
    };
  }
  
  return options;
}

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authOptions = addBasicAuthToFetch(options);
  return fetch(url, authOptions);
}
