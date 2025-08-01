# Dockerfile for API Gateway
FROM node:20-alpine

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

# Expose default port
EXPOSE 4000

# Start the API Gateway
CMD ["encore", "run", "--port=4000"]
