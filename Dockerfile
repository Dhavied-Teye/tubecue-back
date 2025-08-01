# Use Node 18 base image
FROM node:18

# Install system packages needed for yt-dlp + media processing
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    python3 \
    python3-venv \
    python3-pip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set up Python virtual environment and install yt-dlp
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir yt-dlp

# Set working directory
WORKDIR /app

# Install yt-dlp
RUN apt-get update && apt-get install -y wget ffmpeg && \
    wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

RUN apt-get update && apt-get install -y curl ffmpeg \
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod +x /usr/local/bin/yt-dlp


# Copy all backend files into container
COPY . .

# ✅ Copy cookies.txt into /tmp so yt-dlp can use it in deployed environment
COPY youtube_cookies.txt /tmp/youtube_cookies.txt

# Install Node.js dependencies
RUN npm install

# Expose the port your Node.js app runs on
EXPOSE 4000

# Start your Node.js app
CMD ["node", "index.js"]
