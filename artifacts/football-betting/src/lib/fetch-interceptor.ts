/**
 * Intercepts the global fetch to inject the Authorization header with the JWT token
 * for all requests to the /api namespace. This allows the generated Orval hooks
 * to work seamlessly with our custom auth implementation.
 */
const originalFetch = window.fetch;

window.fetch = async (...args) => {
  const [resource, config] = args;
  
  if (typeof resource === 'string' && resource.startsWith('/api')) {
    const token = localStorage.getItem('goalbet_token');
    
    if (token) {
      const headers = new Headers(config?.headers);
      headers.set('Authorization', `Bearer ${token}`);
      
      // Preserve credentials include if needed, but primarily we rely on the Bearer token
      const modifiedConfig = {
        ...config,
        headers,
      };
      
      return originalFetch(resource, modifiedConfig);
    }
  }
  
  return originalFetch(...args);
};

export {};
