// API Configuration
let API_URL = process.env.NEXT_PUBLIC_API_URL;

// Debug logging
console.log('Environment variables:', {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NODE_ENV: process.env.NODE_ENV,
  API_URL
});

if (!API_URL) {
  console.error('NEXT_PUBLIC_API_URL environment variable is not set!');
  if (process.env.NODE_ENV === 'development') {
    console.warn('Using localhost:3001 as fallback in development mode');
    API_URL = 'http://localhost:3001';
  } else {
    // In production, we need a valid API URL
    throw new Error(
      'API_URL is required in production. Please set NEXT_PUBLIC_API_URL to your deployed backend URL (e.g., https://listless-backend-production.up.railway.app)'
    );
  }
}

// Validate the API URL in production
if (process.env.NODE_ENV === 'production') {
  if (API_URL.includes('localhost')) {
    throw new Error(
      'Invalid API_URL in production. NEXT_PUBLIC_API_URL must be set to your deployed backend URL, not localhost.'
    );
  }
  if (!API_URL.startsWith('https://')) {
    console.warn('Warning: API_URL in production should use HTTPS. Current value:', API_URL);
  }
}

export { API_URL }; 