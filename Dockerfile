FROM node:18-slim

# Install system packages
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip && \
    pip3 install yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install

# Copy only the app code
COPY . .

# Expose backend port
EXPOSE 4000

# Start the app
CMD ["node", "index.js"]
