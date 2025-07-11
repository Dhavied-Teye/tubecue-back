# Base stage with only what we need
FROM node:18-slim

# Install system dependencies in one layer
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    pip3 install yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy only necessary files
COPY package*.json ./
RUN npm install

# Copy rest of your backend files
COPY . .

# Expose your backend port
EXPOSE 4000

# Run your backend
CMD ["node", "index.js"]
