/**
 * WHEP (WebRTC-HTTP Egress Protocol) reconnect & status-overlay helpers for MMM-RTSPStream.
 * Loaded via getScripts() and merged onto the module instance in start(), so `this` refers
 * to the module instance as usual.
 */
/* global WHEPClient */
window.MMMRTSPStreamWhepStatus = {
  getReadableWhepReason (reason) {
    const reasons = {
      onError: "transport error",
      stalled: "video stalled",
      ended: "stream ended",
      "video-error": "video element error",
      "hang-timeout": "no media progress",
      "start-failed": "session start failed",
      "restart-failed": "restart attempt failed",
      NoSurface: "missing video surface",
      NoWhep: "missing WHEP URL/client"
    };
    return reasons[reason] || reason || "unknown error";
  },

  setWhepStatus (stream, message, level = "info") {
    if (!this.config.showWhepStatusOverlay) {
      return;
    }
    const targetStream = this.getOverlayStreamKey(stream);
    const overlay = document.getElementById(`status_${targetStream}`);
    if (!overlay) {
      return;
    }
    overlay.textContent = message || "";
    overlay.className = `MMM-RTSPStream statusOverlay ${level}`;
    if (!message) {
      overlay.className += " hidden";
    }
  },

  getWhepRestartState (stream) {
    if (!this.streams[stream].whepRestartState) {
      this.streams[stream].whepRestartState = {
        attempts: 0,
        restarting: false,
        timerId: null,
        lastReason: ""
      };
    }
    return this.streams[stream].whepRestartState;
  },

  clearWhepRestartTimer (stream) {
    const state = this.streams[stream] && this.streams[stream].whepRestartState
      ? this.streams[stream].whepRestartState
      : null;
    if (state && state.timerId) {
      clearTimeout(state.timerId);
      state.timerId = null;
    }
  },

  scheduleWhepRestart (stream, reason) {
    const streamState = this.streams[stream];
    if (!streamState || !streamState.playing || this.suspended) {
      return;
    }

    const state = this.getWhepRestartState(stream);
    if (state.restarting || state.timerId) {
      return;
    }

    const maxAttempts = Number(this.config.whepRestartMaxAttempts || 0);
    if (maxAttempts > 0 && state.attempts >= maxAttempts) {
      Log.error(`[${this.name}] WHEP restart attempts exhausted for ${stream} (last reason: ${reason})`);
      this.setWhepStatus(stream, `Feed unavailable: retries exhausted (${this.getReadableWhepReason(reason)})`, "error");
      return;
    }

    state.attempts += 1;
    state.restarting = true;
    state.lastReason = reason;

    const baseDelay = Number(this.config.whepRestartBaseDelay || 2000);
    const maxDelay = Number(this.config.whepRestartMaxDelay || 30000);
    const delay = Math.min(maxDelay, baseDelay * 2 ** Math.max(0, state.attempts - 1));

    Log.warn(`[${this.name}] Scheduling WHEP restart for ${stream} in ${delay}ms (reason: ${reason}, attempt: ${state.attempts})`);
    this.setWhepStatus(stream, `Reconnecting feed: ${this.getReadableWhepReason(reason)} (attempt ${state.attempts})`, "warn");
    state.timerId = setTimeout(() => {
      state.timerId = null;
      this.restartWhep(stream);
    }, delay);
  },

  restartWhep (stream) {
    const streamState = this.streams[stream];
    if (!streamState || !streamState.playing) {
      return;
    }

    const state = this.getWhepRestartState(stream);
    const session = streamState.webrtc;
    const canvasId = this.config.rotateStreams
      ? "canvas_"
      : `canvas_${stream}`;

    if (session) {
      try {
        if (typeof session.stop === "function") {
          session.stop();
        } else if (session.pc) {
          WHEPClient.stop(document.getElementById(canvasId), session.pc);
        }
      } catch (err) {
        Log.debug(`[${this.name}] Error stopping WHEP session for ${stream}:`, err);
      }
      this.cleanupWhepMonitor(session, stream);
      delete streamState.webrtc;
    }

    this.startWhepSession(stream, document.getElementById(canvasId)).catch(() => {
      this.setWhepStatus(stream, `Feed reconnect failed: ${this.getReadableWhepReason("restart-failed")}`, "error");
      state.restarting = false;
      this.scheduleWhepRestart(stream, "restart-failed");
    });
  },

  cleanupWhepMonitor (session, stream) {
    if (!session || !session.whepMonitor) {
      return;
    }
    if (session.whepMonitor.intervalId) {
      try {
        clearInterval(session.whepMonitor.intervalId);
      } catch (err) {
        Log.debug(`[${this.name}] Error clearing WHEP interval for ${stream}:`, err);
      }
    }
    if (session.whepMonitor.listeners) {
      session.whepMonitor.listeners.forEach((l) => {
        try {
          l[0].removeEventListener(l[1], l[2]);
        } catch (err) {
          Log.debug(`[${this.name}] Error removing WHEP listener for ${stream}:`, err);
        }
      });
    }
  }
};
