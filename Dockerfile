# Dockerfile for API Gateway
FROM node:20

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Install Encore CLI
RUN curl -L https://encore.dev/install.sh | bash

# Make the startup script executable
RUN chmod +x /app/start-gateway.sh

# Expose default port
EXPOSE 4000

# Start the API Gateway
CMD ["/app/start-gateway.sh"]
