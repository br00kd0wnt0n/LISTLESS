# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Set default API URL for build time
# This will be overridden at runtime via Railway environment variables
ENV NEXT_PUBLIC_API_URL="https://listless-backend-production.up.railway.app"
ENV API_URL="https://listless-backend-production.up.railway.app"

# Print environment variables (excluding sensitive ones)
RUN echo "Environment check:" && \
    echo "NODE_ENV: $NODE_ENV" && \
    echo "NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL" && \
    echo "API_URL: $API_URL" && \
    echo "Current directory contents:" && ls -la

# Build with direct output
RUN echo "Starting build process..." && \
    echo "Node version:" && node -v && \
    echo "NPM version:" && npm -v && \
    echo "Running build..." && \
    # First run the build and capture its output
    npm run build 2>&1 | tee /tmp/build.log && \
    # Check the exit status
    if [ ${PIPESTATUS[0]} -ne 0 ]; then \
        echo "=== Build Failed ===" && \
        echo "=== Environment ===" && \
        env | grep -v "SECRET\|KEY\|PASSWORD\|TOKEN" | sort && \
        echo "=== Directory Contents ===" && \
        echo "Current directory:" && \
        ls -la && \
        echo "Next.js build directory:" && \
        ls -la .next || true && \
        echo "Node modules:" && \
        ls -la node_modules || true && \
        echo "=== TypeScript Check ===" && \
        npx tsc --noEmit || true && \
        echo "=== End of Error Report ===" && \
        exit 1; \
    fi

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV production
ENV PORT 3000

# Note: NEXT_PUBLIC_API_URL and API_URL should be set at runtime via Railway environment variables
# The build-time values are only used during the build process
# These environment variables will be overridden by Railway's environment variables

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 