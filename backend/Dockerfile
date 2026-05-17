FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose the server port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]