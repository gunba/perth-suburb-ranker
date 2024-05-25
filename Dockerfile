# Use the specific Node.js version to match the local environment
FROM node:20.11.0-alpine as build-stage

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the application source code
COPY . .

# Build the application
RUN npm run build

# Use a lightweight HTTP server to serve the built application
FROM nginx:alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Expose port 80 to the outside world
EXPOSE 8080

# Command to run the server
CMD ["nginx", "-g", "daemon off;"]
