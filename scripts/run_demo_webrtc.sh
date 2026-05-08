#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MM_DIR="$(cd "${MODULE_DIR}/../.." && pwd)"

MEDIAMTX_VERSION="${MEDIAMTX_VERSION:-v1.13.1}"
UNAME_ARCH="$(uname -m)"

case "${UNAME_ARCH}" in
  x86_64)
    DEFAULT_MEDIAMTX_ARCH="linux_amd64"
    ;;
  aarch64|arm64)
    DEFAULT_MEDIAMTX_ARCH="linux_arm64v8"
    ;;
  armv7l|armv7*)
    DEFAULT_MEDIAMTX_ARCH="linux_armv7"
    ;;
  armv6l|armv6*)
    DEFAULT_MEDIAMTX_ARCH="linux_armv6"
    ;;
  *)
    DEFAULT_MEDIAMTX_ARCH="linux_amd64"
    ;;
esac

MEDIAMTX_ARCH="${MEDIAMTX_ARCH:-${DEFAULT_MEDIAMTX_ARCH}}"
MEDIAMTX_ARCHIVE="${SCRIPT_DIR}/mediamtx.tar.gz"
MEDIAMTX_DIR="${MODULE_DIR}/mediamtx"
MEDIAMTX_BIN="${MEDIAMTX_DIR}/mediamtx"
MEDIAMTX_CFG_SRC="${SCRIPT_DIR}/mediamtx.yml"
MEDIAMTX_CFG_DST="${MEDIAMTX_DIR}/mediamtx.yml"

FFMPEG_PID=""
MEDIAMTX_PID=""
STARTED_MEDIAMTX="0"

require_cmd () {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

wait_for_http () {
  local url="$1"
  local attempts="${2:-30}"
  local sleep_s="${3:-0.5}"
  local i

  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$sleep_s"
  done

  return 1
}

cleanup () {
  set +e

  if [[ -n "${FFMPEG_PID}" ]]; then
    kill "${FFMPEG_PID}" >/dev/null 2>&1 || true
    wait "${FFMPEG_PID}" >/dev/null 2>&1 || true
  fi

  if [[ "${STARTED_MEDIAMTX}" == "1" && -n "${MEDIAMTX_PID}" ]]; then
    kill "${MEDIAMTX_PID}" >/dev/null 2>&1 || true
    wait "${MEDIAMTX_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

require_cmd curl
require_cmd tar
require_cmd ffmpeg

mkdir -p "${MEDIAMTX_DIR}"

if [[ ! -x "${MEDIAMTX_BIN}" ]]; then
  if [[ ! -f "${MEDIAMTX_ARCHIVE}" ]]; then
    echo "Downloading MediaMTX ${MEDIAMTX_VERSION} (${MEDIAMTX_ARCH})..."
    curl -L -o "${MEDIAMTX_ARCHIVE}" "https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_${MEDIAMTX_ARCH}.tar.gz"
  fi

  echo "Extracting MediaMTX..."
  tar -xzf "${MEDIAMTX_ARCHIVE}" -C "${MEDIAMTX_DIR}"
fi

cp "${MEDIAMTX_CFG_SRC}" "${MEDIAMTX_CFG_DST}"

if curl -fsS --max-time 2 http://127.0.0.1:9997/v3/config/global/get >/dev/null 2>&1; then
  echo "Using existing MediaMTX instance on 127.0.0.1:9997"
else
  echo "Starting local MediaMTX..."
  (
    cd "${MEDIAMTX_DIR}"
    ./mediamtx "${MEDIAMTX_CFG_DST}"
  ) &
  MEDIAMTX_PID="$!"
  STARTED_MEDIAMTX="1"

  if ! wait_for_http "http://127.0.0.1:9997/v3/config/global/get" 40 0.5; then
    echo "MediaMTX did not become ready on port 9997" >&2
    exit 1
  fi
fi

echo "Starting FFmpeg test publisher on rtsp://127.0.0.1:8554/test..."
ffmpeg -nostdin -re \
  -f lavfi -i testsrc=size=640x480:rate=25 \
  -f lavfi -i sine=frequency=1000 \
  -pix_fmt yuv420p \
  -c:v libx264 -preset ultrafast -tune zerolatency -b:v 500k \
  -c:a aac -b:a 128k \
  -f rtsp rtsp://127.0.0.1:8554/test \
  -loglevel warning >/dev/null 2>&1 &
FFMPEG_PID="$!"

sleep 1
if ! kill -0 "${FFMPEG_PID}" >/dev/null 2>&1; then
  echo "FFmpeg test stream failed to start. Check your ffmpeg installation/logs." >&2
  exit 1
fi

echo "WHEP endpoint expected at http://127.0.0.1:8889/test/whep"

if [[ "${RTSPSTREAM_SKIP_MM:-0}" == "1" ]]; then
  echo "RTSPSTREAM_SKIP_MM=1 set, not starting MagicMirror."
  exit 0
fi

cd "${MM_DIR}"
MM_CONFIG_FILE=modules/MMM-RTSPStream/demo.config.js node --run start:dev
