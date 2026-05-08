/* eslint-disable complexity */
/* eslint-disable no-negated-condition */
/* eslint-disable func-style */
/* eslint-disable no-param-reassign */
/* eslint-disable func-names */
/* eslint-disable no-empty-function */
/* eslint-disable max-lines */
/* global KeyHandler MM WHEPClient */

/*
 * MagicMirror²
 * Module: MMM-RTSPStream
 *
 * By shbatm
 * MIT Licensed.
 */
const global = this;

Module.register("MMM-RTSPStream", {
  defaults: {
    initialSetup: false,
    debug: false,
    autoStart: true,
    rotateStreams: false,
    rotateStreamTimeout: 10, // Seconds
    showSnapWhenPaused: true,
    localPlayer: "vlc", // 'vlc', 'mplayer' (hardware overlay) or 'webrtc'
    remotePlayer: "none", // 'webrtc' (remote browsers) or 'none' (if localPlayer='webrtc', remotePlayer can be omitted)
    remoteSnaps: true, // Show remote snapshots
    moduleWidth: 384, // Width = (Stream Width + 30px margin + 2px border) * # of Streams Wide
    moduleHeight: 272, // Height = (Stream Height + 30px margin + 2px border) * # of Streams Tall
    moduleOffset: 0, // Offset to align player windows
    shutdownDelay: 11, // Seconds
    animationSpeed: 1500,
    whepAutoRefresh: false, // Enable automatic refresh when a WHEP feed appears hung
    whepCheckInterval: 10000, // How often (ms) to check WHEP feed health
    whepHangTimeout: 60000, // Consider the feed hung if no progress for this many ms
    whepRestartMaxAttempts: 5, // Maximum reconnect attempts (0 = unlimited)
    whepRestartBaseDelay: 2000, // Base delay for reconnect backoff (ms)
    whepRestartMaxDelay: 30000, // Maximum reconnect backoff delay (ms)
    showWhepStatusOverlay: true, // Show a connection status overlay for WebRTC streams
    stream1: {
      name: "BigBuckBunny Test",
      url: "rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov",
      snapshotType: "url", // 'url' or 'file'
      snapshotUrl: "",
      snapshotRefresh: 10, // Seconds
      /* Removed legacy ffmpeg/JSMpeg options: protocol, frameRate, ffmpegPort. */
      // Optional: WebRTC WHEP endpoint for this stream (e.g., "http://<host>:8889/whep/<stream>")
      whepUrl: "",
      width: 320,
      height: 240,
      muted: false
    },

    // MMM-KeyBindings Settings
    keyBindings: {
      enabled: true
    }
  },

  keyBindings: {
    enabled: false,
    mode: "DEFAULT",
    map: {
      Play: "MediaPlayPause",
      Previous: "MediaPreviousTrack",
      Next: "MediaNextTrack",
      Select: "Enter"
    },
    multiInstance: true,
    takeFocus: "Menu"
  },

  requiresVersion: "2.4.0", // Required version of MagicMirror

  playing: false,

  currentIndex: -1,

  currentStream: "",

  streams: {},

  // Allow for control on muliple instances
  instance:
    global.location &&
    [
      "localhost",
      "127.0.0.1",
      "::1",
      "::ffff:127.0.0.1",
      undefined,
      "0.0.0.0"
    ].indexOf(global.location.hostname) > -1
      ? "SERVER"
      : "LOCAL",

  start () {
    const self = this;

    // Flag for check if module is loaded
    this.loaded = false;

    if (!this.config.initialSetup) {
      this.sendSocketNotification("CONFIG", this.config);

      Object.keys(this.config)
        .filter((key) => key.startsWith("stream"))
        .forEach((key) => {
          self.streams[key] = {playing: false, status: {message: "", level: "info"}};
        });
    }
  },

  setupStreamRotation () {
    this.playing = this.config.autoStart;
    // Reference to function for manual transitions (TODO: FUTURE)
    this.manualTransition = this.rotateStream.bind(this);
    // Call the first stream
    this.manualTransition();
    this.restartTimer();
  },

  rotateStream (goToStream = undefined, goDirection = 0) {
    const k = Object.keys(this.streams);
    let ps;
    const resetCurrentIndex = k.length;
    const lastStream = this.currentStream;

    // Update the current index
    if (goToStream && goToStream in this.streams) {
      this.currentStream = goToStream; // Go to a specific slide if in range
    } else {
      if (goDirection === 0) {
        this.currentIndex += 1; // Normal Transition, Increment by 1
      } else {
        this.currentIndex += goDirection; // Told to go a specific direction
      }
      if (this.currentIndex >= resetCurrentIndex) {
        // Wrap-around back to beginning
        this.currentIndex = 0;
      } else if (this.currentIndex < 0) {
        this.currentIndex = resetCurrentIndex - 1; // Went too far backwards, wrap-around to end
      }
      this.currentStream = k[this.currentIndex];
    }

    if (this.playing) {
      if (lastStream) {
        this.stopStream(lastStream);
      }
      ps = this.playStream(this.currentStream);
      if (ps.length > 0) {
        if (this.config.localPlayer === "vlc") {
          this.sendSocketNotification("PLAY_VLCSTREAM", ps);
        }
      }
    } else {
      if (lastStream) {
        this.sendSocketNotification("SNAPSHOT_STOP", lastStream);
      }
      this.playSnapshots(this.currentStream);
    }
  },

  restartTimer () {
    if (
      this.config.rotateStreams &&
      Object.keys(this.streams).length > 1 &&
      this.config.rotateStreamTimeout > 0
    ) {
      // Restart the timer
      if (this.transitionTimer) {
        clearInterval(this.transitionTimer);
      }
      this.transitionTimer = setInterval(
        this.manualTransition,
        this.config.rotateStreamTimeout * 1000
      );
    }
  },

  /*
   * suspend()
   * This method is called when a module is hidden.
   */
  suspend () {
    Log.log(`${this.name} is suspended...`);
    this.suspended = true;
    this.stopAllStreams(false);
    if (this.selectedStream) {
      this.selectStream(undefined, true);
    }
  },

  /*
   * resume()
   * This method is called when a module is shown.
   */
  resume () {},

  resumed (callback) {
    Log.log(`${this.name} has resumed... rotateStreams: ${this.config.rotateStreams}, autoStart: ${this.config.autoStart}`);
    this.suspended = false;
    if (this.loaded) {
      if (this.config.rotateStreams) {
        this.setupStreamRotation();
      } else if (this.config.autoStart) {
        this.playAll();
      } else {
        Log.log("Playing all snapshots");
        Object.keys(this.streams).forEach((s) => this.playSnapshots(s));
      }
    }
    if (typeof callback === "function") {
      callback();
    }
  },

  // Overwrite the module show method to force a callback.
  show (speed, callback, options) {
    if (typeof callback === "object") {
      options = callback;
      callback = function () {};
    }

    const newCallback = () => {
      this.resumed(callback);
    };
    options ||= {};

    MM.showModule(this, speed, newCallback, options);
  },

  playBtnCallback (s) {
    let ps;
    if (this.config.rotateStreams) {
      if (this.playing) {
        this.stopStream(this.currentStream);
        this.playSnapshots(this.currentStream);
      } else {
        this.sendSocketNotification("SNAPSHOT_STOP", this.currentStream);
        ps = this.playStream(this.currentStream);
        if (ps.length > 0) {
          if (this.config.localPlayer === "vlc") {
            this.sendSocketNotification("PLAY_VLCSTREAM", ps);
          }
        }
      }
    } else if (this.streams[s].playing) {
      this.stopStream(s);
      this.playSnapshots(s);
    } else {
      this.sendSocketNotification("SNAPSHOT_STOP", s);
      ps = this.playStream(s);
      if (ps.length > 0) {
        if (this.config.localPlayer === "vlc") {
          this.sendSocketNotification("PLAY_VLCSTREAM", ps);
        }
      }
    }
  },

  playBtnDblClickCB (s) {
    if (this.instance === "SERVER" && !this.streams[s].playing) {
      const ps = this.playStream(s, true);
      if (ps.length > 0) {
        if (this.config.localPlayer === "vlc") {
          this.sendSocketNotification("PLAY_VLCSTREAM", ps);
        }
      }
    } else {
      this.playBtnCallback(s);
    }
  },

  getDom () {
    // create element wrapper for show into the module
    const wrapper = document.createElement("div");

    if (this.config.initialSetup) {
      const configUrl = `http://${global.location.hostname}:${global.location.port}/${this.name}/config.html`;
      const outputString = `Use config wizard at <a href="${configUrl}" target="_blank">${configUrl}</a><br>to generate a configuration for this module.`;
      wrapper.innerHTML = outputString;
      Log.log(outputString);

      return wrapper;
    }
    if (!this.loaded) {
      wrapper.innerHTML = `Loading ${this.name}...`;
      wrapper.className = "dimmed light small";
      return wrapper;
    }
    if (this.error) {
      wrapper.innerHTML = "Error loading data...";
      return wrapper;
    }

    if (this.loaded) {
      wrapper.style.cssText = `width: ${this.config.moduleWidth}px; height:${this.config.moduleHeight}px`;
      wrapper.className = "MMM-RTSPStream wrapper";

      if (this.config.rotateStreams) {
        const iw = this.getInnerWrapper("");
        iw.appendChild(this.getCanvas(""));
        iw.appendChild(this.getPlayPauseBtn(""));
        wrapper.appendChild(iw);
        wrapper.appendChild(this.getStatusOverlay(""));
      } else {
        Object.keys(this.streams).forEach((stream) => {
          const iw = this.getInnerWrapper(stream);
          iw.appendChild(this.getCanvas(stream));
          iw.appendChild(this.getPlayPauseBtn(stream));
          wrapper.appendChild(iw);
          wrapper.appendChild(this.getStatusOverlay(stream));
        });
      }
      wrapper.appendChild(document.createElement("br"));
    }
    return wrapper;
  },

  getCanvasSize (streamConfig) {
    let s = "";
    if (typeof streamConfig.width !== "undefined") {
      s += `width: ${streamConfig.width}px; `;
    }
    if (typeof streamConfig.height !== "undefined") {
      s += `height: ${streamConfig.height}px; line-height: ${streamConfig.height};`;
    }
    return s;
  },

  getCanvas (stream) {
    const useWebRTC = this.instance === "LOCAL" && this.config.remotePlayer === "webrtc" || this.instance === "SERVER" && this.config.localPlayer === "webrtc";
    // In WebRTC mode, use a <video> element as the drawing surface.
    if (useWebRTC) {
      const video = document.createElement("video");
      video.id = `canvas_${stream}`;
      video.className = "MMM-RTSPStream canvas";
      video.setAttribute("playsinline", "");
      video.autoplay = true;
      try {
        if (stream && typeof this.config[stream].muted !== "undefined") {
          video.muted = this.config[stream].muted;
        } else {
          video.muted = true; // safer default for autoplay
        }
      } catch {
        video.muted = true;
      }
      return video;
    }
    const canvas = document.createElement("canvas");
    canvas.id = `canvas_${stream}`;
    canvas.className = "MMM-RTSPStream canvas";
    return canvas;
  },

  getInnerWrapper (stream) {
    const innerWrapper = document.createElement("div");
    innerWrapper.className = "MMM-RTSPStream innerWrapper";
    if (!stream) {
      stream = "stream1";
    }
    innerWrapper.style.cssText = this.getCanvasSize(this.config[stream]);
    innerWrapper.id = `iw_${stream}`;
    return innerWrapper;
  },

  getStatusOverlay (stream) {
    const overlay = document.createElement("div");
    overlay.className = "MMM-RTSPStream statusOverlay hidden";
    overlay.id = `status_${stream}`;
    return overlay;
  },

  getOverlayStreamKey (stream) {
    return this.config.rotateStreams
      ? ""
      : stream;
  },

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

  getPlayPauseBtn (stream) {
    const self = this;

    function makeOnClickHandler (s) {
      return function () {
        self.playBtnCallback(s);
      };
    }

    function makeOnDblClickHandler (s) {
      return function () {
        self.playBtnDblClickCB(s);
      };
    }

    const playBtnWrapper = document.createElement("div");
    playBtnWrapper.className = "control";
    playBtnWrapper.onclick = makeOnClickHandler(stream);
    playBtnWrapper.oncontextmenu = makeOnDblClickHandler(stream);
    playBtnWrapper.id = `playBtnWrapper_${stream}`;

    const playBtnLabel = document.createElement("label");
    playBtnLabel.id = `playBtnLabel_${stream}`;
    playBtnLabel.innerHTML = "<i class=\"fa fa-play-circle\"></i>";
    playBtnWrapper.appendChild(playBtnLabel);
    return playBtnWrapper;
  },

  updatePlayPauseBtn (stream, forceVisible = false) {
    const buttonId = this.config.rotateStreams
      ? "playBtnLabel_"
      : `playBtnLabel_${stream}`;
    const button = document.getElementById(buttonId);
    if (!button) {
      // If not ready yet, retry in 1 second.
      setTimeout(() => this.updatePlayPauseBtn(stream, forceVisible), 1000);
      return;
    }
    if (stream !== "" && this.streams[stream].playing) {
      button.innerHTML = "<i class=\"fa fa-pause-circle\"></i>";
    } else {
      button.innerHTML = "<i class=\"fa fa-play-circle\"></i>";
    }

    if (forceVisible) {
      button.style.cssText = "opacity: 0.6;";
      button.parentElement.style.cssText = "opacity: 1;";
    } else {
      button.style.cssText = "";
      button.parentElement.style.cssText = "";
    }
  },

  playStream (stream, fullscreen = false, absPosition = undefined) {
    const canvasId = this.config.rotateStreams
      ? "canvas_"
      : `canvas_${stream}`;
    const surface = document.getElementById(canvasId);
    const vlcPayload = [];

    if (this.streams[stream].playing) {
      this.stopStream(stream);
    }

    const webrtcActive = this.instance === "LOCAL" && this.config.remotePlayer === "webrtc" || this.instance === "SERVER" && this.config.localPlayer === "webrtc";

    if (this.instance === "SERVER" && this.config.localPlayer === "vlc") {
      const rect = surface.getBoundingClientRect();
      const offset = {};
      const payload = {name: stream};
      if (typeof this.config.moduleOffset === "object") {
        offset.left =
          "left" in this.config.moduleOffset
            ? this.config.moduleOffset.left
            : 0;
        offset.top =
          "top" in this.config.moduleOffset
            ? this.config.moduleOffset.top
            : 0;
      } else {
        offset.left = this.config.moduleOffset;
        offset.top = this.config.moduleOffset;
      }
      let box = {};
      if ("absPosition" in this.config[stream]) {
        box = this.config[stream].absPosition;
      } else if (typeof absPosition !== "undefined") {
        box = absPosition;
      } else if (fullscreen) {
        payload.fullscreen = true;
      } else {
        box = {
          top: Math.round(rect.top + offset.top), // Compensate for Margins
          right: Math.round(rect.right + offset.left), // Compensate for Margins
          bottom: Math.round(rect.bottom + offset.top), // Compensate for Margins
          left: Math.round(rect.left + offset.left) // Compensate for Margins
        };
      }
      payload.box = box;
      vlcPayload.push(payload);
    } else if (webrtcActive) {
      // WebRTC (WHEP) playback path (server or remote browser)
      const {whepUrl} = this.config[stream];
      if (whepUrl && typeof WHEPClient !== "undefined") {
        surface.muted = this.config[stream].muted !== false; // Default muted for autoplay
        // Start WHEP playback and monitoring via helper method
        this.startWhepSession(stream, surface).catch(() => {});
      } else {
        Log.warn(`[${this.name}] No WHEP URL configured for stream ${stream}`);
      }
    } else if (surface?.tagName === "CANVAS") {
      // No playback path selected; show placeholder label (canvas only)
      const ctx = surface.getContext("2d");
      ctx.clearRect(0, 0, surface.width, surface.height);
      ctx.font = "16px Roboto Condensed";
      ctx.fillStyle = "white";
      ctx.fillText(this.config[stream].name, 10, 25);
    }

    this.streams[stream].playing = true;
    this.playing = true;
    this.updatePlayPauseBtn(stream);
    return vlcPayload;
  },

  playSnapshots (stream) {
    // Show the snapshot instead of the stream
    const snapUrl = this.config[stream].snapshotUrl;
    const canvasId = this.config.rotateStreams
      ? "canvas_"
      : `canvas_${stream}`;
    const element = document.getElementById(canvasId);

    // Handle both canvas and video elements (WebRTC mode uses <video>)
    const isVideo = element?.tagName === "VIDEO";
    if (isVideo) {
      element.poster = ""; // Clear any poster
      element.removeAttribute("src");
      element.srcObject = null;
    }

    /*
     * For drawing text/placeholder, we need a canvas context
     * Video elements don't have getContext, so create an overlay or skip drawing
     */
    if (!isVideo && element) {
      const ctx = element.getContext("2d");
      ctx.clearRect(0, 0, element.width, element.height);
      if (!snapUrl || !this.config.showSnapWhenPaused) {
        ctx.font = "16px Roboto Condensed";
        ctx.fillStyle = "white";
        ctx.fillText(this.config[stream].name, 10, 25);
      }
    }

    if (snapUrl && this.config.showSnapWhenPaused) {
      this.sendSocketNotification("SNAPSHOT_START", stream);
      this.updatePlayPauseBtn(stream);
    } else {
      this.updatePlayPauseBtn(stream, true);
    }
  },

  playAll () {
    let ps = [];
    Object.keys(this.streams).forEach((s) => {
      const webrtcActive = this.instance === "LOCAL" && this.config.remotePlayer === "webrtc" || this.instance === "SERVER" && this.config.localPlayer === "webrtc";
      if (this.instance === "SERVER" || webrtcActive) {
        const res = this.playStream(s);
        if (res.length > 0) {
          ps = ps.concat(res);
        }
        if (!(this.instance === "SERVER" && this.config.remoteSnaps) && !(webrtcActive && this.instance === "SERVER")) {
          this.sendSocketNotification("SNAPSHOT_STOP", s);
        }
      }
    });
    if (ps.length > 0) {
      if (this.config.localPlayer === "vlc") {
        this.sendSocketNotification("PLAY_VLCSTREAM", ps);
      }
    }
  },

  stopStream (stream, vlcStopAll = false) {
    if (this.streams[stream].playing) {
      if (
        this.instance === "SERVER" &&
        this.config.localPlayer === "vlc" &&
        !vlcStopAll
      ) {
        this.sendSocketNotification("STOP_VLCSTREAM", {
          name: stream,
          delay: this.config.shutdownDelay
        });
      } else if ("player" in this.streams[stream]) {
        this.streams[stream].player.destroy();
        delete this.streams[stream].player;
      } else if ("webrtc" in this.streams[stream]) {
        // Use session.stop() if available (new API), fallback to legacy
        const session = this.streams[stream].webrtc;
        this.clearWhepRestartTimer(stream);
        const restartState = this.streams[stream].whepRestartState;
        if (restartState) {
          restartState.attempts = 0;
          restartState.restarting = false;
          restartState.lastReason = "";
        }
        // Clear any monitor interval and event listeners attached to session
        try {
          this.cleanupWhepMonitor(session, stream);
        } catch (e) {
          Log.warn(`[${this.name}] Error cleaning WHEP monitor for ${stream}:`, e);
        }

        if (typeof session.stop === "function") {
          session.stop();
        } else {
          const canvasId = this.config.rotateStreams
            ? "canvas_"
            : `canvas_${stream}`;
          WHEPClient.stop(document.getElementById(canvasId), session.pc);
        }
        delete this.streams[stream].webrtc;
      }
      this.streams[stream].playing = false;
      this.setWhepStatus(stream, "", "info");
    }

    if (
      Object.keys(this.streams).filter((s) => s.playing).length === 0
    ) {
      this.playing = false;
    }
  },

  // Start a WHEP session for a stream and attach a periodic health monitor
  startWhepSession (stream, surface) {
    const whepUrl = this.config[stream] && this.config[stream].whepUrl
      ? this.config[stream].whepUrl
      : "";
    if (!whepUrl || typeof WHEPClient === "undefined") {
      Log.warn(`[${this.name}] No WHEP URL or client for stream ${stream}`);
      this.setWhepStatus(stream, "Feed connection failed: missing WHEP endpoint", "error");
      return Promise.reject(new Error("NoWhep"));
    }

    if (!surface) {
      Log.warn(`[${this.name}] No video surface found for stream ${stream}`);
      this.setWhepStatus(stream, "Feed connection failed: video surface unavailable", "error");
      return Promise.reject(new Error("NoSurface"));
    }

    const state = this.getWhepRestartState(stream);

    return WHEPClient.start(surface, whepUrl, {
      audio: !this.config[stream].muted,
      onError: (err) => {
        Log.warn(`[${this.name}] WebRTC error for ${stream}:`, err);
        this.scheduleWhepRestart(stream, "onError");
      }
    })
      .then((session) => {
        this.setWhepStatus(stream, "", "info");
        session.whepMonitor = {intervalId: null, lastProgress: Date.now(), listeners: []};

        const updateProgress = () => {
          session.whepMonitor.lastProgress = Date.now();
        };
        const onEnded = () => this.scheduleWhepRestart(stream, "ended");
        const onVideoError = () => this.scheduleWhepRestart(stream, "video-error");
        try {
          surface.addEventListener("playing", updateProgress);
          surface.addEventListener("timeupdate", updateProgress);
          surface.addEventListener("loadeddata", updateProgress);
          surface.addEventListener("canplay", updateProgress);
          surface.addEventListener("ended", onEnded);
          surface.addEventListener("error", onVideoError);
          session.whepMonitor.listeners.push([surface, "playing", updateProgress]);
          session.whepMonitor.listeners.push([surface, "timeupdate", updateProgress]);
          session.whepMonitor.listeners.push([surface, "loadeddata", updateProgress]);
          session.whepMonitor.listeners.push([surface, "canplay", updateProgress]);
          session.whepMonitor.listeners.push([surface, "ended", onEnded]);
          session.whepMonitor.listeners.push([surface, "error", onVideoError]);
          // stalled only triggers restart when whepAutoRefresh is on
          if (this.config.whepAutoRefresh) {
            const onStalled = () => this.scheduleWhepRestart(stream, "stalled");
            surface.addEventListener("stalled", onStalled);
            session.whepMonitor.listeners.push([surface, "stalled", onStalled]);
          }
        } catch (err) {
          Log.debug(`[${this.name}] Surface event registration failed for ${stream}:`, err);
        }

        const checkInterval = this.config.whepCheckInterval || 10000;
        const hangTimeout = this.config.whepHangTimeout || 60000;

        if (this.config.whepAutoRefresh) {
          session.whepMonitor.intervalId = setInterval(() => {
            const now = Date.now();
            const last = session.whepMonitor.lastProgress || 0;
            if (now - last > hangTimeout) {
              this.scheduleWhepRestart(stream, "hang-timeout");
            }
          }, checkInterval);
        }

        this.streams[stream].webrtc = session;
        state.attempts = 0;
        state.restarting = false;
        this.clearWhepRestartTimer(stream);
        return session;
      })
      .catch((err) => {
        const isRetryAttempt = state.attempts > 0 || state.restarting;
        if (isRetryAttempt) {
          Log.warn(`[${this.name}] WHEP restart attempt failed for ${stream}:`, err);
        } else {
          Log.error(`[${this.name}] WHEP start failed for ${stream}:`, err);
        }
        this.setWhepStatus(stream, `Feed connection failed: ${this.getReadableWhepReason("start-failed")}`, "error");
        this.scheduleWhepRestart(stream, "start-failed");
        throw err;
      });
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
  },

  stopAllStreams (startSnapshots = true) {
    let vlcStopAll = false;
    if (this.instance === "SERVER" && this.config.localPlayer === "vlc") {
      this.sendSocketNotification(
        "STOP_ALL_VLCSTREAMS",
        this.config.shutdownDelay
      );
      vlcStopAll = true;
    }
    Object.keys(this.streams).forEach((s) => {
      this.stopStream(s, vlcStopAll);
      if (startSnapshots) {
        if (!this.config.rotateStreams) {
          this.playSnapshots(s);
        }
      } else {
        this.sendSocketNotification("SNAPSHOT_STOP", s);
      }
      this.updatePlayPauseBtn(s);
    });
    if (startSnapshots && this.config.rotateStreams) {
      this.manualTransition();
      this.restartTimer();
    }
  },

  toggleStreams (payload) {
    let ps = [];
    if (this.config.rotateStreams) {
      if (this.playing) {
        this.stopStream(this.currentStream);
        this.playSnapshots(this.currentStream);
      } else {
        const webrtcActive = this.instance === "LOCAL" && this.config.remotePlayer === "webrtc" || this.instance === "SERVER" && this.config.localPlayer === "webrtc";
        if (this.instance === "SERVER" && !this.config.remoteSnaps || webrtcActive) {
          this.sendSocketNotification("SNAPSHOT_STOP", this.currentStream);
        }
        if (this.instance === "SERVER" || webrtcActive) {
          ps = this.playStream(this.currentStream);
        }
      }
    } else if (!this.selectedStream) {
      if (this.playing) {
        this.stopAllStreams();
      } else {
        this.playAll();
      }
    } else if (this.streams[this.selectedStream].playing) {
      this.stopStream(this.selectedStream);
      this.playSnapshots(this.selectedStream);
    } else {
      const webrtcActive = this.instance === "LOCAL" && this.config.remotePlayer === "webrtc" || this.instance === "SERVER" && this.config.localPlayer === "webrtc";
      if (this.instance === "SERVER" && !this.config.remoteSnaps || webrtcActive) {
        this.sendSocketNotification("SNAPSHOT_STOP", this.selectedStream);
      }
      if (
        this.instance === "SERVER" &&
        payload.KeyState === "KEY_LONGPRESSED"
      ) {
        ps = this.playStream(this.selectedStream, true);
      } else if (this.instance === "SERVER" || webrtcActive) {
        ps = this.playStream(this.selectedStream);
      }
    }
    if (ps.length > 0) {
      if (this.config.localPlayer === "vlc") {
        this.sendSocketNotification("PLAY_VLCSTREAM", ps);
      }
    }
  },

  getScripts () {
    const scripts = [];
    if (this.instance === "LOCAL" && this.config.remotePlayer === "webrtc" || this.instance === "SERVER" && this.config.localPlayer === "webrtc") {
      scripts.push(this.file("scripts/webrtc-whep.js"));
    }
    return scripts;
  },

  getStyles () {
    return [`${this.name}.css`, "font-awesome.css"];
  },

  notificationReceived (notification, payload) {
    let ps = [];

    if (notification === "DOM_OBJECTS_CREATED") {
      // Register Key Handler
      if (
        this.config.keyBindings.enabled &&
        MM.getModules().filter((kb) => kb.name === "MMM-KeyBindings").length > 0
      ) {
        this.keyBindings = {
          ...this.keyBindings,
          ...this.config.keyBindings
        };
        KeyHandler.register(this.name, {
          sendNotification: (n, p) => {
            this.sendNotification(n, p);
          },
          validKeyPress: (kp) => {
            this.validKeyPress(kp);
          }
        });
        this.keyHandler = KeyHandler.create(this.name, this.keyBindings);
      }

      const api = {
        module: this.name,
        path: "stream",
        actions: {
          play: {
            notification: "RTSP-PLAY",
            prettyName: "Play Stream(s)"
          },
          stop: {
            notification: "RTSP-STOP",
            prettyName: "Stop Stream(s)"
          },
          fullscreen: {
            notification: "RTSP-PLAY-FULLSCREEN",
            prettyName: "Play Fullscreen"
          },
          window: {
            notification: "RSTP-PLAY-WINDOW",
            prettyName: "Play in Window"
          }
        }
      };
      this.sendNotification("REGISTER_API", api);
    }
    if (this.keyHandler && this.keyHandler.validate(notification, payload)) {
      return;
    }

    // Handle USER_PRESENCE events from the MMM-PIR-sensor Module
    if (notification === "USER_PRESENCE") {
      if (payload) {
        if (this.suspended && this.suspendedForUserPresence) {
          this.resumed();
        }
        this.suspendedForUserPresence = false;
      } else {
        this.suspend();
        this.suspendedForUserPresence = true;
      }
    }
    if (notification === "RTSP-PLAY" && this.instance === "SERVER") {
      if (!payload || JSON.stringify(payload) === "{}" || payload === "all") {
        if (this.config.rotateStreams) {
          this.playing = true;
          this.manualTransition(undefined, 1);
          this.restartTimer();
        } else {
          this.playAll();
        }
      } else if (this.config.rotateStreams) {
        this.playing = true;
        this.manualTransition(payload);
        this.restartTimer();
      } else {
        ps = this.playStream(payload);
      }
    }
    if (notification === "RTSP-PLAY-FULLSCREEN" && this.instance === "SERVER") {
      ps = this.playStream(payload, true);
    }
    if (notification === "RSTP-PLAY-WINDOW" && this.instance === "SERVER") {
      ps = this.playStream(payload.name, false, payload.box);
    }
    if (notification === "RTSP-STOP" && this.instance === "SERVER") {
      if (!payload || JSON.stringify(payload) === "{}" || payload === "all") {
        this.stopAllStreams();
      } else {
        this.stopStream(payload);
      }
    }

    if (ps.length > 0) {
      if (this.config.localPlayer === "vlc") {
        this.sendSocketNotification("PLAY_VLCSTREAM", ps);
      }
    }
  },

  validKeyPress (kp) {
    // Example for responding to "Left" and "Right" arrow
    Log.log(kp);
    if (kp.keyName === this.keyHandler.config.map.Play) {
      this.toggleStreams(kp);
    }
    if (kp.keyName === this.keyHandler.config.map.Next) {
      if (this.config.rotateStreams) {
        this.manualTransition(undefined, 1);
        this.restartTimer();
      } else {
        this.selectStream(1);
      }
    } else if (kp.keyName === this.keyHandler.config.map.Previous) {
      if (this.config.rotateStreams) {
        this.manualTransition(undefined, -1);
        this.restartTimer();
      } else {
        this.selectStream(-1);
      }
    }
  },

  selectedStream: "",

  selectStream (direction = 1, clear = false) {
    const k = Object.keys(this.streams);
    if (!clear) {
      if (!this.selectedStream) {
        [this.selectedStream] = k;
      } else {
        const i = k.indexOf(this.selectedStream);
        let newI = i + direction;
        if (newI >= k.length) {
          newI = 0;
        } else if (newI < 0) {
          newI = k.length - 1;
        }
        this.selectedStream = k[newI];
      }
    } else {
      this.selectedStream = "";
    }
    k.forEach((s) => {
      if (s !== this.selectedStream) {
        const iw = document.getElementById(`iw_${s}`);
        iw.style.cssText = iw.style.cssText.replace("border-color: red;", "");
      } else {
        document.getElementById(`iw_${s}`).style.cssText +=
          "border-color: red;";
      }
    });
  },
  // socketNotificationReceived from helper
  socketNotificationReceived (notification, payload) {
    if (notification === "STARTED") {
      if (!this.loaded) {
        this.loaded = true;
        this.updateDom(this.config.animationSpeed);
        if (!this.suspended) {
          setTimeout(() => this.resumed(), this.config.animationSpeed + 500);
        }
      }
    }
    if (notification === "SNAPSHOT") {
      if (payload.image) {
        let img = document.getElementById(`img_${payload.name}`);
        if (img === null) {
          const iw = document.getElementById(`iw_${payload.name}`);
          img = document.createElement("img");
          img.style.width = "100%";
          img.style.height = "100%";
          img.id = `img_${payload.name}`;
          Log.log(iw, img);
          img.className = "MMM-RTSPStream snapshot";
          iw.appendChild(img);
        }
        img.src = payload.buffer;
      }
    }
  }
});
