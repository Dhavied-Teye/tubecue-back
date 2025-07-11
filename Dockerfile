# Start with a Python image because Whisper and Demucs need it
FROM python:3.10-slim

# Install system tools like ffmpeg, curl, nodejs, and npm
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    git \
    nodejs \
    npm \
    && apt-get clean

# Install the tools you use
RUN pip install --no-cache-dir yt-dlp openai-whisper demucs

# Create app folder inside the container
WORKDIR /app

# Copy your backend files into the Docker image
COPY . .

# Install the Node dependencies (like express)
RUN npm install

# Expose the backend port
EXPOSE 4000

# Run the app
CMD ["node", "index.js"]
