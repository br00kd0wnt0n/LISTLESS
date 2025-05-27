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
  // In development, we'll use localhost as a fallback
  if (process.env.NODE_ENV === 'development') {
    console.warn('Using localhost:3001 as fallback in development mode');
    API_URL = 'http://localhost:3001';
  } else {
    throw new Error('API_URL is required in production');
  }
}

export { API_URL }; 