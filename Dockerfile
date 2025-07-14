FROM node:18

# Install required system packages
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    python3 \
    python3-venv \
    python3-pip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment, install yt-dlp
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir yt-dlp

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install Node.js dependencies
RUN npm install

# Expose backend port
EXPOSE 4000

# Start the server
CMD ["node", "index.js"]
