/* eslint-disable max-lines */
/* eslint-disable no-negated-condition */
/* eslint-disable camelcase */
/*
 * MagicMirror²
 * Node Helper: MMM-RTSPStream
 *
 * By shbatm
 * MIT Licensed.
 */

const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const DataURI = require("datauri");
const Log = require("logger");
const NodeHelper = require("node_helper");
const {Stream} = require("node-ffmpeg-stream");

const environ = Object.assign(process.env, {DISPLAY: ":0"});

module.exports = NodeHelper.create({
  config: {},

  ffmpegStreams: {},

  vlcStream: {},
  vlcStreamTimeouts: {},
  vlcDelayedExit: {},

  snapshots: {},

  start () {
    this.started = false;
  },

  stop () {
    Log.log(`Shutting down MMM-RTSPStream streams that were using ${this.config.localPlayer}`);

    // Kill any FFMPEG strems that are running
    if (
      this.config.localPlayer === "ffmpeg" ||
      this.config.remotePlayer === "ffmpeg"
    ) {
      Object.keys(this.ffmpegStreams).forEach((s) => this.ffmpegStreams[s].stop());
    }

    // Kill any VLC Streams that are open
    if (this.config.localPlayer === "vlc") {
      if (this.dp2) {
        Log.log("Killing DevilsPie2...");
        this.dp2.stderr.removeAllListeners();
        this.dp2.kill();
        this.dp2 = undefined;
      }
      this.stopAllVlcPlayers();
    }
  },

  startListener (name) {
    if (
      (this.config.localPlayer === "ffmpeg" ||
        this.config.remotePlayer === "ffmpeg") &&
        this.config[name].url
    ) {
      if (this.config.shutdownDelay) {
        this.config[name].shutdownDelay = this.config.shutdownDelay * 1000;
      }
      if (this.config.debug) {
        this.config[name].hideFfmpegOutput = false;
      }
      
      // Configure for node-ffmpeg-stream
      const streamConfig = {
        name,
        url: this.config[name].url,
        wsPort: this.config[name].ffmpegPort,
        options: {
          "-r": this.config[name].frameRate || "30",
          "-rtsp_transport": this.config[name].protocol || "tcp"
        }
      };
      
      this.ffmpegStreams[name] = new Stream(streamConfig);
    }
  },

  getData (name) {
    // Log.log("Getting data for "+name);
    const self = this;

    const snapUrl = this.config[name].snapshotUrl;

    if (!snapUrl) {
      Log.log(`No snapshotUrl given for ${name}. Ignoring.`);
      return;
    }

    if (
      typeof this.config[name].snapshotType !== "undefined" &&
      this.config[name].snapshotType === "file"
    ) {
      const datauri = new DataURI();
      datauri.encode(snapUrl, (err, content) => {
        if (err) {
          throw err;
        }
        self.sendSocketNotification("SNAPSHOT", {
          name,
          image: true,
          buffer: content
        });
      });
    } else {
      fetch(snapUrl, {
        method: "GET"
      })
        .then(async (response) => {
          if (response.status === 200) {
            const buffer = await response.buffer();
            self.sendSocketNotification("SNAPSHOT", {
              name,
              image: true,
              buffer: `data:image/jpeg;base64,${buffer.toString("base64")}`
            });
          } else if (response.status === 401) {
            self.sendSocketNotification(`DATA_ERROR_${name}`, "401 Error");
            Log.error(self.name, "401 Error");
          } else {
            Log.error(
              self.name,
              "Could not load data.",
              response.statusText
            );
          }
        })
        .catch((error) => {
          Log.error(self.name, "ERROR: Could not load data.", error);
        });
      return;
    }
    this.snapshots[name] = setTimeout(() => {
      self.getData(name);
    }, this.config[name].snapshotRefresh * 1000);
  },

  getVlcPlayer (payload) {
    const opts = {
      detached: false,
      env: environ,
      stdio: ["ignore", "ignore", "pipe"]
    };
    const vlcCmd = "vlc";
    const positions = {};
    let dp2Check = false;

    payload.forEach((s) => {
      // Abort a single delayed shutdown, if there was one.
      if (s.name in this.vlcDelayedExit && s.name in this.vlcStream) {
        clearTimeout(this.vlcDelayedExit[s.name]);
        delete this.vlcDelayedExit[s.name];
        child_process.exec(
          `wmctrl -r ${s.name} -b remove,hidden && wmctrl -a ${s.name}`,
          {env: environ},
          (error) => {
            if (error) {
              Log.error(`exec error: ${error}`);
            }
          }
        );
      } else {
        // Otherwise, Generate the VLC window
        const args = [
          "-I",
          "dummy",
          "--video-on-top",
          "--no-video-deco",
          "--no-embedded-video",
          `--video-title=${s.name}`,
          this.config[s.name].url
        ];
        if ("fullscreen" in s && "hdUrl" in this.config[s.name]) {
          args.pop();
          args.push(this.config[s.name].hdUrl);
        } else if (!("fullscreen" in s)) {
          args.unshift(
            "--width",
            s.box.right - s.box.left,
            "--height",
            s.box.bottom - s.box.top
          );
          positions[s.name] = `${s.box.left}, ${s.box.top}, ${
            s.box.right - s.box.left
          }, ${s.box.bottom - s.box.top}`;
        }
        if (this.config[s.name].muted) {
          args.unshift("--no-audio");
        }
        Log.log(`Starting stream ${s.name} using VLC with args ${args.join(" ")}...`);

        this.vlcStream[s.name] = child_process.spawn(vlcCmd, args, opts);

        this.vlcStream[s.name].on("error", () => {
          Log.error(`Failed to start subprocess: ${this.vlcStream[s.name]}.`);
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
      Object.keys(positions).forEach((p) => {
        dp2Config += `
if (get_window_name()=="${p}") then
    set_window_geometry(${positions[p]});
    undecorate_window();
    set_on_top();
    make_always_on_top();
end
`;
      });
    }

    const startDp2 = () => {
      if (this.dp2) {
        this.dp2.stderr.removeAllListeners();
        this.dp2.kill();
        this.dp2 = undefined;
      }
      Log.info("DP2: Running window resizers...");
      this.dp2 = child_process.spawn(dp2Cmd, dp2Args, opts);
      this.dp2.on("error", () => {
        Log.error("DP2: Failed to start.");
      });
    };

    const vlcLuaPath = path.resolve(`${__dirname}/scripts/vlc.lua`);
    // Check if the vlc.lua file exists, if not, create it.
    if (!fs.existsSync(vlcLuaPath)) {
      Log.log("DP2: Creating vlc.lua file...");
      fs.writeFileSync(vlcLuaPath, "");
    }
    fs.readFile(
      vlcLuaPath,
      "utf8",
      (err, data) => {
        if (err) {
          throw err;
        }

        // Only write the new DevilsPie2 config if we need to.
        if (data !== dp2Config) {
          fs.writeFile(
            vlcLuaPath,
            dp2Config,
            (innerErr) => {
              // throws an error, you could also catch it here
              if (innerErr) {
                throw innerErr;
              }

              Log.log("DP2: Config File Saved!");
              if (this.config.debug) {
                Log.log(dp2Config);
              }
              startDp2();
              // Give the windows time to settle, then re-call to resize again.
              setTimeout(() => {
                startDp2();
              }, 7000 * payload.length);
            }
          );
        } else {
          startDp2();
          setTimeout(() => {
            startDp2();
          }, 7000 * payload.length);
        }
      }
    );
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
          child_process.exec(
            `wmctrl -r ${name} -b add,hidden`,
            {env: environ},
            (error) => {
              if (error) {
                Log.error(`exec error: ${error}`);
              }
            }
          );
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
      Object.keys(this.vlcStream).forEach((s) => {
        if (delay) {
          this.stopVlcPlayer(s, delay);
        } else {
          try {
            this.vlcStream[s].stderr.removeAllListeners();
            this.vlcStream[s].kill();
            delete this.vlcStream[s];
            delete this.vlcDelayedExit[s];
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
      const streams = Object.keys(this.config).filter((key) => key.startsWith("stream"));
      if (
        this.config.rotateStreams &&
        this.config.shutdownDelay &&
        this.config.shutdownDelay <
          (streams.length - 1) * this.config.rotateStreamsTimeout
      ) {
        const suggestedDelay =
          (streams.length - 1) * this.config.rotateStreamsTimeout + 2;
        Log.warn(`WARNING: shutdownDelay is shorter than the time it takes to make it through the loop. Consider increasing to ${suggestedDelay}s.`);
      }
      streams.forEach((name) => {
        this.startListener(name);
        this.sendSocketNotification("STARTED", name);
      });
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
