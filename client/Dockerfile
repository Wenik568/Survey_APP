# Frontend Dockerfile for Railway
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Railway provides PORT environment variable
EXPOSE ${PORT:-80}

# Use envsubst to replace PORT in nginx config at runtime
CMD sh -c "envsubst '\$PORT' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
