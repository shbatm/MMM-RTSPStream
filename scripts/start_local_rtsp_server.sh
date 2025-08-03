#!/bin/bash

# RTSP Test Stream Setup Script
# Author: Kristjan ESPERANTO
# Description:
#    This script automates MediaMTX setup and FFmpeg test stream.
#    It downloads and sets up MediaMTX for RTSP streaming and starts a
#    test stream using FFmpeg.
#    You can use it to test MMM-RTSPStream.
#    This script assumes you have curl and ffmpeg installed on your system.
# Test configuration:
#        {
#            module: "MMM-RTSPStream",
#            position: "middle_center",
#            config: {
#                autoStart: true,
#                rotateStreams: true,
#                rotateStreamTimeout: 10,
#                moduleWidth: 354,
#                moduleHeight: 240,
#                localPlayer: 'ffmpeg',
#                remotePlayer: 'none',
#                showSnapWhenPaused: true,
#                remoteSnaps: true,
#                shutdownDelay: 12,
#                stream1: {
#                    name: 'Test Stream',
#                    url: 'rtsp://localhost:8554/mystream',
#                    width: undefined,
#                    height: undefined,
#                    ffmpegPort: 9999,
#                    }
#            }
#        },

set -e

# if mediamtx_v1.13.1_linux_amd64.tar.gz already exists, skip download
if [ -f "mediamtx.tar.gz" ]; then
  echo "📦 MediaMTX archive already exists. Skipping download."
else
  echo "📦 Downloading MediaMTX..."
  curl -L -o mediamtx.tar.gz https://github.com/bluenviron/mediamtx/releases/download/v1.13.1/mediamtx_v1.13.1_linux_amd64.tar.gz
fi

echo "📂 Extracting MediaMTX..."
if [ ! -d "mediamtx" ]; then
  mkdir mediamtx
fi

tar -xzf mediamtx.tar.gz -C mediamtx

if pgrep -x "mediamtx" > /dev/null; then
  echo "⚠️ MediaMTX server is already running. Stopping it..."
  pkill -f mediamtx
  sleep 2  # Give it a moment to stop
else
  echo "✅ MediaMTX server is not running."
fi

cd mediamtx

echo "🚀 Starting MediaMTX server in background..."
./mediamtx &

sleep 5  # Give the server time to start

# check if ffmpeg is already running
if pgrep -x "ffmpeg" > /dev/null; then
  echo "⚠️ FFmpeg is already running. Stopping it..."
  pkill -f ffmpeg
  sleep 2  # Give it a moment to stop
else
  echo "✅ FFmpeg is not running."
fi

echo "🎥 Starting FFmpeg test stream..."
ffmpeg -re \
  -f lavfi -i testsrc=size=640x480:rate=30 \
  -f lavfi -i sine=frequency=1000 \
  -c:v libx264 -tune zerolatency \
  -c:a aac \
  -f rtsp rtsp://localhost:8554/mystream &

sleep 5

echo "✅ Stream is live at rtsp://localhost:8554/mystream"
echo "📺 You can view it using VLC or ffplay:"
echo "    ffplay rtsp://localhost:8554/mystream"
