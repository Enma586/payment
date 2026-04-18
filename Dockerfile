# Use the official Node.js 20 slim image for a lightweight production build
FROM node:20-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker layer caching
# This ensures that 'npm install' only runs when dependencies change
COPY package*.json ./

# Install only production dependencies to keep the image size minimal
RUN npm install --omit=dev

# Copy the rest of the application source code
COPY . .

# Inform Docker that the container listens on the specified network port at runtime
EXPOSE 3000

# Define the command to run the application
CMD ["node", "server.js"]