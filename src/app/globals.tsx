// ===== frontend/src/app/globals.css =====
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }
  
  body {
    @apply text-gray-900 bg-gray-50;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 font-medium;
  }
  
  .btn-secondary {
    @apply bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 font-medium;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-sm border p-6;
  }
  
  .voice-indicator {
    @apply inline-flex items-center justify-center w-3 h-3 rounded-full;
  }
  
  .voice-listening {
    @apply bg-red-500 animate-pulse;
  }
  
  .voice-processing {
    @apply bg-yellow-500 animate-pulse;
  }
  
  .voice-ready {
    @apply bg-green-500;
  }
}

:root {
  --primary-50: #f0f9ff;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
}