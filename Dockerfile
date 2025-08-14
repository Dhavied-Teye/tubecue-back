# Use Node 18 base image
FROM node:18

# Install system packages needed for yt-dlp + media processing
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-venv python3-pip curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy the rest of the backend files
COPY . .

# ✅ Copy cookies.txt into /tmp so yt-dlp can use it in deployed environment
COPY youtube_cookies.txt /tmp/youtube_cookies.txt

# Expose the port your Node.js app runs on
EXPOSE 4000

# Start your Node.js app
CMD ["node", "index.js"]
