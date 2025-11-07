# Use Node.js LTS version
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install system dependencies for PDF parsing
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create cache directory for transformers
RUN mkdir -p /app/.cache && chmod 777 /app/.cache

# Set environment variables for transformers
ENV TRANSFORMERS_CACHE=/app/.cache
ENV HF_HOME=/app/.cache

# Copy package files
COPY package*.json ./

# Install dependencies: prefer npm ci when a lockfile exists, otherwise fall back to npm install
RUN if [ -f package-lock.json ]; then \
            echo "🧰 package-lock.json found, running npm ci --only=production"; \
            npm ci --only=production; \
        else \
            echo "🧰 package-lock.json not found, running npm install --omit=dev --no-audit --no-fund"; \
            npm install --omit=dev --no-audit --no-fund; \
        fi

# Copy application files
COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p public

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "index.js"]
