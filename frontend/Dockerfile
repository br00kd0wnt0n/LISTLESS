# Use Node.js 18 as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install dependencies with verbose output
RUN npm install --verbose

# Copy the rest of the application
COPY . .

# Build the application with verbose output
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npm run build --verbose || (echo "Build failed. Contents of .next directory:" && ls -la .next && exit 1)

# Set environment variables
ENV PORT=3000
ENV NEXT_PUBLIC_API_URL=https://listless-backend-production.up.railway.app

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 