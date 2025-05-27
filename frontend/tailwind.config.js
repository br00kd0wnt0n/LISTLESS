// ===== frontend/tailwind.config.js =====
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          border: "hsl(var(--border))",
          background: "rgb(var(--background) / <alpha-value>)",
          foreground: "rgb(var(--foreground) / <alpha-value>)",
          primary: {
            DEFAULT: "hsl(var(--primary))",
            foreground: "hsl(var(--primary-foreground))",
            50: 'hsl(210, 100%, 97%)',
            100: 'hsl(210, 100%, 94%)',
            200: 'hsl(210, 100%, 88%)',
            300: 'hsl(210, 100%, 80%)',
            400: 'hsl(210, 100%, 70%)',
            500: 'hsl(210, 100%, 60%)',
            600: 'hsl(210, 100%, 50%)',
            700: 'hsl(210, 100%, 40%)',
            800: 'hsl(210, 100%, 30%)',
            900: 'hsl(210, 100%, 20%)',
          },
          secondary: {
            DEFAULT: "hsl(var(--secondary))",
            foreground: "hsl(var(--secondary-foreground))",
            50: 'hsl(210, 40%, 98%)',
            100: 'hsl(210, 40%, 96%)',
            200: 'hsl(210, 40%, 90%)',
            300: 'hsl(210, 40%, 80%)',
            400: 'hsl(210, 40%, 70%)',
            500: 'hsl(210, 40%, 60%)',
            600: 'hsl(210, 40%, 50%)',
            700: 'hsl(210, 40%, 40%)',
            800: 'hsl(210, 40%, 30%)',
            900: 'hsl(210, 40%, 20%)',
          }
        },
        fontFamily: {
          sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
          mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        },
        animation: {
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'bounce-slow': 'bounce 2s infinite',
        }
      }
    },
    plugins: [],
  }