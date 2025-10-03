FROM node:18-alpine

# Create app directory
WORKDIR /app

# Add curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Create user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S attendance -u 1001
RUN chown -R attendance:nodejs /app

USER attendance

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]