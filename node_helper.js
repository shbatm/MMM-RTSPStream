/* eslint-disable max-lines */
/*
 * MagicMirror²
 * Node Helper: MMM-RTSPStream
 *
 * By shbatm
 * MIT Licensed.
 */

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const Log = require("logger");
const NodeHelper = require("node_helper");
const createWindowManager = require("./scripts/window-manager");

const environ = Object.assign(process.env, {DISPLAY: ":0"});
const SNAPSHOT_MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml"
};

const getSnapshotMimeType = function getSnapshotMimeType (filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SNAPSHOT_MIME_BY_EXT[ext] || "application/octet-stream";
};

const windowManager = createWindowManager({environ});

module.exports = NodeHelper.create({
  config: {},

  /*
   * Removed software decoding (ffmpeg + JSMpeg) path in v4.0.0.
   * Any legacy config referencing localPlayer/remotePlayer "ffmpeg" will be warned and ignored.
   */

  vlcStream: {},
  vlcStreamTimeouts: {},
  vlcDelayedExit: {},
  dp2RestartTimer: null,

  snapshots: {},

  start () {
    this.started = false;
  },

  stop () {
    Log.log(`Shutting down MMM-RTSPStream (localPlayer=${this.config.localPlayer})`);

    // Kill any VLC/MPlayer Streams that are open
    if (this.config.localPlayer === "vlc" || this.config.localPlayer === "mplayer") {
      if (windowManager.isRunning()) {
        Log.log("Killing DevilsPie2...");
      }
      windowManager.stop();
      this.stopAllVlcPlayers();
    }
  },

  // Legacy no-op retained so existing calls don't break; intentionally left minimal.
  startListener () {
    return undefined;
  },

  async getData (name) {
    // Log.log("Getting data for "+name);
    const snapUrl = this.config[name].snapshotUrl;

    if (!snapUrl) {
      Log.log(`No snapshotUrl given for ${name}. Ignoring.`);
      return;
    }

    if (
      typeof this.config[name].snapshotType !== "undefined" &&
      this.config[name].snapshotType === "file"
    ) {
      const mimeType = getSnapshotMimeType(snapUrl);
      try {
        const buffer = await fs.promises.readFile(snapUrl);
        const content = `data:${mimeType};base64,${buffer.toString("base64")}`;
        this.sendSocketNotification("SNAPSHOT", {
          name,
          image: true,
          buffer: content
        });
      } catch (error) {
        Log.error(this.name, `ERROR: Could not load snapshot file for ${name}.`, error);
      }
    } else {
      try {
        const response = await fetch(snapUrl, {
          method: "GET"
        });

        if (response.status === 200) {
          const buffer = await response.buffer();
          this.sendSocketNotification("SNAPSHOT", {
            name,
            image: true,
            buffer: `data:image/jpeg;base64,${buffer.toString("base64")}`
          });
        } else if (response.status === 401) {
          this.sendSocketNotification(`DATA_ERROR_${name}`, "401 Error");
          Log.error(this.name, "401 Error");
        } else {
          Log.error(
            this.name,
            "Could not load data.",
            response.statusText
          );
        }
      } catch (error) {
        Log.error(this.name, "ERROR: Could not load data.", error);
      }
      return;
    }
    this.snapshots[name] = setTimeout(() => {
      this.getData(name);
    }, this.config[name].snapshotRefresh * 1000);
  },

  async getVlcPlayer (payload) {
    const opts = {
      detached: false,
      env: environ,
      stdio: ["ignore", "ignore", "pipe"]
    };
    const playerCmd = this.config.localPlayer === "mplayer"
      ? "mplayer"
      : "vlc";
    const isMPlayer = this.config.localPlayer === "mplayer";
    const positions = {};
    let dp2Check = false;

    payload.forEach((streamPayload) => {
      // Abort a single delayed shutdown, if there was one.
      if (streamPayload.name in this.vlcDelayedExit && streamPayload.name in this.vlcStream) {
        clearTimeout(this.vlcDelayedExit[streamPayload.name]);
        delete this.vlcDelayedExit[streamPayload.name];
        windowManager.unhideWindow(streamPayload.name);
      } else {
        // Otherwise, Generate the player window
        let args;
        if (isMPlayer) {
          // MPlayer arguments
          args = ["-noborder", "-ontop", "-title", streamPayload.name];
          if ("fullscreen" in streamPayload && "hdUrl" in this.config[streamPayload.name]) {
            args.push("-fs", this.config[streamPayload.name].hdUrl);
          } else if (!("fullscreen" in streamPayload)) {
            const width = streamPayload.box.right - streamPayload.box.left;
            const height = streamPayload.box.bottom - streamPayload.box.top;
            args.push("-geometry", `${width}x${height}+${streamPayload.box.left}+${streamPayload.box.top}`);
            args.push(this.config[streamPayload.name].url);
            positions[streamPayload.name] = `${streamPayload.box.left}, ${streamPayload.box.top}, ${width}, ${height}`;
          }
          if (this.config[streamPayload.name].muted) {
            args.splice(1, 0, "-nosound");
          }
        } else {
          // VLC arguments
          args = [
            "-I",
            "dummy",
            "--video-on-top",
            "--no-video-deco",
            "--no-embedded-video",
            `--video-title=${streamPayload.name}`,
            this.config[streamPayload.name].url
          ];
          if ("fullscreen" in streamPayload && "hdUrl" in this.config[streamPayload.name]) {
            args.pop();
            args.push(this.config[streamPayload.name].hdUrl);
          } else if (!("fullscreen" in streamPayload)) {
            args.unshift(
              "--width",
              streamPayload.box.right - streamPayload.box.left,
              "--height",
              streamPayload.box.bottom - streamPayload.box.top
            );
            positions[streamPayload.name] = `${streamPayload.box.left}, ${streamPayload.box.top}, ${
              streamPayload.box.right - streamPayload.box.left
            }, ${streamPayload.box.bottom - streamPayload.box.top}`;
          }
          if (this.config[streamPayload.name].muted) {
            args.unshift("--no-audio");
          }
        }
        Log.log(`Starting stream ${streamPayload.name} using ${playerCmd.toUpperCase()} with args ${args.join(" ")}...`);

        this.vlcStream[streamPayload.name] = childProcess.spawn(playerCmd, args, opts);

        this.vlcStream[streamPayload.name].on("error", () => {
          Log.error(`Failed to start subprocess: ${this.vlcStream[streamPayload.name]}.`);
        });

        dp2Check = true;
      }
    });

    if (!dp2Check) {
      return;
    }
    const dp2Cmd = "devilspie2";
    const dp2Args = ["--debug", "-f", path.resolve(`${__dirname}/scripts`)];
    let dp2Config = "";
    if (this.config.rotateStreams) {
      dp2Config = `
local function starts_with(str, start)
   return str:sub(1, #start) == start
end
if (starts_with(get_window_name(), "stream")) then
    set_window_geometry(${payload[0].box.left}, ${payload[0].box.top}, ${
      payload[0].box.right - payload[0].box.left
    }, ${payload[0].box.bottom - payload[0].box.top});
    undecorate_window();
    set_on_top();
end
`;
    } else {
      Object.keys(positions).forEach((windowName) => {
        dp2Config += `
if (get_window_name()=="${windowName}") then
    set_window_geometry(${positions[windowName]});
    undecorate_window();
    set_on_top();
    make_always_on_top();
end
`;
      });
    }

    const startDp2 = () => {
      windowManager.start(dp2Cmd, dp2Args, opts);
    };

    const vlcLuaPath = path.resolve(`${__dirname}/scripts/vlc.lua`);
    let currentConfig;
    try {
      currentConfig = await fs.promises.readFile(vlcLuaPath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") {
        Log.error("DP2: Failed to read vlc.lua config.", error);
        return;
      }
      Log.log("DP2: Creating vlc.lua file...");
      try {
        await fs.promises.writeFile(vlcLuaPath, "");
        currentConfig = "";
      } catch (writeError) {
        Log.error("DP2: Failed to create vlc.lua file.", writeError);
        return;
      }
    }

    // Only write the new DevilsPie2 config if we need to.
    if (currentConfig !== dp2Config) {
      try {
        await fs.promises.writeFile(vlcLuaPath, dp2Config);
      } catch (error) {
        Log.error("DP2: Failed to write vlc.lua config.", error);
        return;
      }
      Log.log("DP2: Config File Saved!");
      if (this.config.debug) {
        Log.log(dp2Config);
      }
    }
    startDp2();
    // Give the windows time to settle, then re-call to resize again.
    windowManager.scheduleRestart(() => {
      startDp2();
    }, 7000 * payload.length);
  },

  stopVlcPlayer (name, delay, callback) {
    const quitVlc = () => {
      Log.log(`Stopping stream ${name}`);
      if (name in this.vlcStream) {
        try {
          this.vlcStream[name].stderr.removeAllListeners();
          this.vlcStream[name].kill();
        } catch (err) {
          Log.log(err);
        }
        delete this.vlcStream[name];
        delete this.vlcDelayedExit[name];
      }
    };
    if (name in this.vlcStream) {
      if (delay) {
        if (!(name in this.vlcDelayedExit)) {
          this.vlcDelayedExit[name] = setTimeout(() => {
            quitVlc();
          }, delay * 1000);
          // execFile avoids shell interpolation of name (untrusted config value)
          windowManager.hideWindow(name);
        }
      } else {
        quitVlc();
      }
    }
    if (typeof callback === "function") {
      callback();
    }
  },

  stopAllVlcPlayers (delay, callback) {
    if (Object.keys(this.vlcStream).length > 0) {
      Log.log(delay
        ? `Delayed exit of all VLC Streams in ${delay} sec...`
        : "Killing All VLC Streams...");
      Object.keys(this.vlcStream).forEach((streamName) => {
        if (delay) {
          this.stopVlcPlayer(streamName, delay);
        } else {
          try {
            this.vlcStream[streamName].stderr.removeAllListeners();
            this.vlcStream[streamName].kill();
            delete this.vlcStream[streamName];
            delete this.vlcDelayedExit[streamName];
          } catch (err) {
            Log.log(err);
          }
        }
      });
    }
    if (typeof callback === "function") {
      callback();
    }
  },

  // Override socketNotificationReceived method.

  /*
   * socketNotificationReceived(notification, payload)
   * This method is called when a socket notification arrives.
   *
   * argument notification string - The identifier of the noitication.
   * argument payload mixed - The payload of the notification.
   */
  socketNotificationReceived (notification, payload) {
    if (notification === "CONFIG") {
      this.config = payload;
      const legacyWarnings = [];
      const streams = Object.keys(this.config).filter((key) => key.startsWith("stream"));
      if (
        this.config.rotateStreams &&
        this.config.shutdownDelay &&
        this.config.shutdownDelay <
          (streams.length - 1) * this.config.rotateStreamTimeout
      ) {
        const suggestedDelay =
          (streams.length - 1) * this.config.rotateStreamTimeout + 2;
        Log.warn(`WARNING: shutdownDelay is shorter than the time it takes to make it through the loop. Consider increasing to ${suggestedDelay}s.`);
      }
      // Warn & sanitize legacy config values
      if (this.config.localPlayer === "ffmpeg") {
        Log.warn("MMM-RTSPStream: localPlayer 'ffmpeg' removed in v4.0.0. For local playback only 'vlc' is supported.");
        legacyWarnings.push("localPlayer: 'ffmpeg' is no longer supported; using 'vlc' instead.");
        this.config.localPlayer = "vlc";
      }
      if (this.config.remotePlayer === "ffmpeg") {
        Log.warn("MMM-RTSPStream: remotePlayer 'ffmpeg' removed in v4.0.0. Use 'webrtc' (with whepUrl per stream) or 'none'.");
        legacyWarnings.push("remotePlayer: 'ffmpeg' is no longer supported; using 'none' instead.");
        this.config.remotePlayer = "none";
      }
      streams.forEach((name) => {
        if (typeof this.config[name]?.ffmpegPort !== "undefined") {
          legacyWarnings.push(`${name}.ffmpegPort is no longer used in v4 and should be removed.`);
        }
      });
      if (legacyWarnings.length > 0) {
        this.sendSocketNotification("CONFIG_WARNINGS", legacyWarnings);
      }
      streams.forEach((name) => this.sendSocketNotification("STARTED", name));
    }
    if (notification === "SNAPSHOT_START") {
      if (!(payload in this.snapshots)) {
        this.getData(payload);
      }
    }
    if (notification === "SNAPSHOT_STOP") {
      if (payload in this.snapshots) {
        clearTimeout(this.snapshots[payload]);
        delete this.snapshots[payload];
      }
    }
    if (notification === "PLAY_VLCSTREAM") {
      this.getVlcPlayer(payload);
    }
    if (notification === "STOP_VLCSTREAM") {
      this.stopVlcPlayer(payload.name, payload.delay);
    }
    if (notification === "STOP_ALL_VLCSTREAMS") {
      if (Object.keys(this.vlcStream).length > 0) {
        this.stopAllVlcPlayers(payload);
      }
    }
  }
});
