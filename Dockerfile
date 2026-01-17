# Use the official Playwright image which includes Node.js and browser dependencies
FROM mcr.microsoft.com/playwright:v1.49.1-noble

# Set working directory
WORKDIR /app

# Copy package files first to leverage cache
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
# .dockerignore will exclude node_modules, .env, etc.
COPY . .

# Build the TypeScript application
RUN npm run build

# Expose the API port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
