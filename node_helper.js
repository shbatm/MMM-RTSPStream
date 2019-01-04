/* Magic Mirror
 * Node Helper: MMM-RTSPStream
 *
 * By shbatm
 * MIT Licensed.
 */
/* jshint esversion: 6*/

var NodeHelper = require("node_helper");
var Stream = require('node-rtsp-stream-es6');
var request = require('request');
const fs = require('fs');
const path = require("path");
const DataURI = require('datauri');
const datauri = new DataURI();
const psTree = require('ps-tree');
const child_process = require('child_process');
const environ = Object.assign(process.env, { DISPLAY: ":0" });

module.exports = NodeHelper.create({

    config: {},

    ffmpegStreams: {},

    omxStream: {},
    omxStreamTimeouts: {},

    vlcStream: {},
    vlcStreamTimeouts: {},
    vlcDelayedExit: {},

    snapshots: {},

    start: function() {
        this.started = false;
        this.stopAllOmxplayers();
    },

    stop: function() {
        console.log("Shutting down MMM-RTSPStream streams...");

        // Kill any running OMX Streams
        if (Object.keys(this.omxStream).length > 0) {
            this.stopAllOmxplayers();
        }

        // Kill any FFMPEG strems that are running
        Object.keys(this.ffmpegStreams).forEach(s => this.ffmpegStreams[s].stopStream(0));

        // Kill any VLC Streams that are open
        if (this.dp2) {
            console.log("Killing DevilsPie2...");
            this.dp2.kill();
            this.dp2 = undefined;
        }
        this.stopAllVlcPlayers();
    },

    startListener: function(name) {
        if ((this.config.localPlayer === 'ffmpeg' || this.config.remotePlayer === 'ffmpeg') && this.config[name].url) {
            if (this.config.shutdownDelay) {
                this.config[name].shutdownDelay = this.config.shutdownDelay * 1000;
            }
            if (this.config.debug) {
                this.config[name].hideFfmpegOutput = false;
            }
            this.ffmpegStreams[name] = new Stream(this.config[name]);
        }
    },

    getData: function(name) {
        // console.log("Getting data for "+name);
        var self = this;

        var snapUrl = this.config[name].snapshotUrl;

        if (!snapUrl) {
            console.log("No snapshotUrl given for " + name + ". Ignoring.");
            return;
        }

        if (typeof this.config[name].snapshotType !== "undefined" && this.config[name].snapshotType === "file") {
            datauri.encode(this.config[name].snapshotUrl, (err, content) => {
                if (err) {
                    throw err;
                }
                self.sendSocketNotification("SNAPSHOT", { name: name, image: true, buffer: content });
            });
        } else {
            request({
                url: snapUrl,
                method: 'GET',
                encoding: null,
            }, function(error, response, body) {
                if (!error && typeof response !== "undefined" && response.statusCode == 200) {
                    self.sendSocketNotification("SNAPSHOT", { name: this.callerName, image: true, buffer: 'data:image/jpeg;base64,' + body.toString('base64') });
                } else if (error || response.statusCode === 401) {
                    self.sendSocketNotification("DATA_ERROR_" + this.callerName, error);
                    console.error(self.name, error);
                } else {
                    console.error(self.name, "Could not load data.");
                }
            }.bind({ callerName: name })); //.pipe(fs.createWriteStream('/home/pi/snapshot.jpg').on("close", function() { console.log("done"); } ) ); // Debugging code to write file to disk
        }
        this.snapshots[name] = setTimeout(function() { self.getData(name); }, this.config[name].snapshotRefresh * 1000);
    },

    getVlcPlayer: function(payload) {
        var self = this;
        var opts = { detached: false, env: environ };
        var vlcCmd = `vlc`;
        var positions = {};
        let dp2Check = false;

        payload.forEach(s => {
            // Abort a single delayed shutdown, if there was one.
            if (s.name in this.vlcDelayedExit && s.name in this.vlcStream) {
                clearTimeout(this.vlcDelayedExit[s.name]);
                delete this.vlcDelayedExit[s.name];
                child_process.exec(`wmctrl -r ${s.name} -b remove,hidden && wmctrl -a ${s.name}`, { env: environ }, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`exec error: ${error}`);
                        return;
                    }
                });
                return;
            } else {
                // Otherwise, Generate the VLC window
                var args = ["-I", "dummy", '--video-on-top', "--no-video-deco", "--no-embedded-video", `--video-title=${s.name}`,
                    this.config[s.name].url
                ];
                if ("fullscreen" in s && "hdUrl" in this.config[s.name]) {
                    args.pop();
                    args.push(this.config[s.name].hdUrl);
                } else if (!("fullscreen" in s)) {
                    args.unshift("--width", s.box.right - s.box.left, "--height", s.box.bottom - s.box.top);
                    positions[s.name] = `${s.box.left}, ${s.box.top}, ${s.box.right-s.box.left}, ${s.box.bottom-s.box.top}`;
                }
                console.log(`Starting stream ${s.name} using VLC with args ${args.join(' ')}...`);

                this.vlcStream[s.name] = child_process.spawn(vlcCmd, args, opts);

                this.vlcStream[s.name].on('error', (err) => {
                    console.error(`Failed to start subprocess: ${this.vlcStream[s.name]}.`);
                });

                dp2Check = true;
            }
        });

        if (!dp2Check) { return; }
        var dp2Cmd = `devilspie2`;
        var dp2Args = ['--debug', '-f', path.resolve(__dirname + '/scripts')];
        let dp2Config = ``;
        if (this.config.rotateStreams) {
            dp2Config = `
local function starts_with(str, start)
   return str:sub(1, #start) == start
end
if (starts_with(get_window_name(), "stream")) then
    set_window_geometry(${payload[0].box.left}, ${payload[0].box.top}, ${payload[0].box.right-payload[0].box.left}, ${payload[0].box.bottom-payload[0].box.top});
    undecorate_window();
    set_on_top();
end
`;
        } else {
            Object.keys(positions).forEach(p => {
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

        var startDp2 = () => {
            if (this.dp2) {
                this.dp2.kill();
                this.dp2 = undefined;
            }
            console.info("DP2: Running window resizers...");
            this.dp2 = child_process.spawn(dp2Cmd, dp2Args, opts);
            this.dp2.on('error', (err) => {
                console.error('DP2: Failed to start.');
            });
        };


        fs.readFile(path.resolve(__dirname + '/scripts/vlc.lua'), "utf8", (err, data) => {
            if (err) throw err;

            // Only write the new DevilsPie2 config if we need to.
            if (data !== dp2Config) {
                fs.writeFile(path.resolve(__dirname + '/scripts/vlc.lua'), dp2Config, (err) => {
                    // throws an error, you could also catch it here
                    if (err) throw err;

                    console.log('DP2: Config File Saved!');
                    if (this.config.debug) { console.log(dp2Config); }
                    startDp2();
                    // Give the windows time to settle, then re-call to resize again.
                    setTimeout(() => { startDp2(); }, 7000 * payload.length);
                });
            } else {
                startDp2();
                setTimeout(() => { startDp2(); }, 7000 * payload.length);
            }
        });
    },

    stopVlcPlayer: function(name, delay) {
        let quitVlc = () => {
            console.log(`Stopping stream ${name}`);
            if (name in this.vlcStream) {
                try {
                    this.vlcStream[name].kill();
                } catch (err) {
                    console.log(err);
                }
                delete this.vlcStream[name];
                delete this.vlcDelayedExit[name];
            }
        };
        if (name in this.vlcStream) {
            if (delay) {
                if (!(name in this.vlcDelayedExit)) {
                    this.vlcDelayedExit[name] = setTimeout(() => { quitVlc(); }, delay * 1000);
                    child_process.exec(`wmctrl -r ${name} -b add,hidden`, { env: environ }, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`exec error: ${error}`);
                            return;
                        }
                    });
                }
            } else {
                quitVlc();
            }
        }
    },

    stopAllVlcPlayers: function(delay) {
        if (Object.keys(this.vlcStream).length > 0) {
            console.log((delay) ? "Delayed exit of all VLC Streams in " + delay + " sec..." : "Killing All VLC Streams...");
            Object.keys(this.vlcStream).forEach(s => {
                if (delay) {
                    this.stopVlcPlayer(s, delay);
                } else {
                    try {
                        this.vlcStream[s].kill();
                        delete this.vlcStream[s];
                        delete this.vlcDelayedExit[s];
                    } catch (err) {
                        console.log(err);
                    }
                }
            });
        }
    },

    getOmxplayer: function(payload) {
        var self = this;
        var opts = { detached: false, stdio: 'ignore' };

        var omxCmd = `omxplayer`;

        var namesM = [];

        var argsM = [];

        payload.forEach(s => {
            var args = ["--live", "--video_queue", "4", "--fps", "30",
                this.config[s.name].url
            ];
            if (!("fullscreen" in s)) {
                args.unshift("--win", `${s.box.left}, ${s.box.top}, ${s.box.right}, ${s.box.bottom}`);
            } else {
                if ("hdUrl" in this.config[s.name]) {
                    args.pop();
                    args.push(this.config[s.name].hdUrl);
                }
            }
            if (this.config[s.name].protocol !== "udp") {
                args.unshift("--avdict", "rtsp_transport:tcp");
            }
            if (this.config.debug) {
                args.unshift("-I");
            }
            console.log(`Starting stream ${s.name} with args: ${JSON.stringify(args,null,4)}`);

            argsM.push(args);
            namesM.push("omx_" + s.name);
        });

        // this.omxStream[payload.name] = child_process.spawn(omxCmd, args, opts);

        // PM2 Test
        var pm2 = require('pm2');

        pm2.connect((err) => {
            if (err) {
                console.error(err);
                process.exit(2);
            }

            // Stops the Daemon if it's already started
            pm2.list((err, list) => {
                var errCB = (err, apps) => {
                    if (err) { console.log(err); }
                };

                var startProcs = () => {
                    if (namesM.length > 0) {
                        console.log("Starting PM2 for " + namesM[namesM.length - 1]);
                        pm2.start({
                            script: "omxplayer",
                            name: namesM[namesM.length - 1],
                            interpreter: 'bash',
                            out_file: "/dev/null",
                            //interpreterArgs: '-u',
                            args: argsM[namesM.length - 1],
                            //max_memory_restart : '100M'   // Optional: Restarts your app if it reaches 100Mo
                        }, (err, proc) => {
                            console.log("PM2 started for " + namesM[namesM.length - 1]);
                            this.omxStream[namesM[namesM.length - 1]] = namesM[namesM.length - 1];

                            // Automatically Restart OMX PM2 Instance every X Hours
                            let restartHrs = this.config.omxRestart;
                            if (typeof restartHrs === "number") {
                                let worker = () => {
                                    pm2.restart(namesM[namesM.length - 1], function() {});
                                    this.omxStreamTimeouts[namesM[namesM.length - 1]] = setTimeout(worker, restartHrs * 60 * 60 * 1000);
                                };
                                this.omxStreamTimeouts[namesM[namesM.length - 1]] = setTimeout(worker, restartHrs * 60 * 60 * 1000);
                            }

                            namesM.pop();
                            argsM.pop();
                            startProcs();
                            if (err) { throw err; }
                        });
                    } else {
                        pm2.disconnect(); // Disconnects from PM2
                    }
                };

                for (var proc in list) {
                    if ("name" in list[proc] && namesM.indexOf(list[proc].name) > -1) {
                        if ("status" in list[proc].pm2_env && list[proc].pm2_env.status === "online") {
                            console.log(`PM2: ${list[proc].name} already running. Stopping old instance...`);
                            pm2.stop(list[proc].name, errCB);
                        }
                    }
                }

                startProcs();
            });

        });
    },

    stopOmxplayer: function(name) {
        console.log(`Stopping stream ${name}`);
        var pm2 = require('pm2');

        pm2.connect((err) => {
            if (err) {
                console.error(err);
            }

            console.log("Stopping PM2 process: omx_" + name);
            pm2.stop("omx_" + name, function(err, apps) {
                pm2.disconnect();
                if (err) { console.log(err); }
            });
        });

        clearTimeout(this.omxStreamTimeouts[name]);
        delete this.omxStream[name];
    },

    stopAllOmxplayers: function() {
        console.log('PM2: Stopping all OMXPlayer Streams...');
        var pm2 = require('pm2');

        pm2.connect((err) => {
            if (err) {
                console.error(err);
            }
            // console.log('PM2: Connected.');

            // Stops the Daemon if it's already started
            pm2.list((err, list) => {
                var errCB = (err, apps) => {
                    if (err) { console.log(err); }
                };

                var toStop = [];

                var stopProcs = () => {
                    if (toStop.length > 0) {
                        pm2.stop(toStop[toStop.length - 1], (e, p) => {
                            if (e) { console.log(e); throw e; }
                            toStop.pop();
                            stopProcs();
                        });
                    } else {
                        pm2.disconnect();
                        this.omxStream = {};
                        Object.keys(this.omxStreamTimeouts).forEach(s => {
                            clearTimeout(s);
                        });
                    }
                };

                for (var proc in list) {
                    if ("name" in list[proc] && list[proc].name.startsWith("omx_")) {
                        console.log(`PM2: Checking if ${list[proc].name} is running...`);
                        if ("status" in list[proc].pm2_env && list[proc].pm2_env.status === "online") {
                            console.log(`PM2: Stopping ${list[proc].name}...`);
                            toStop.push(list[proc].name);
                        }
                    }
                }

                stopProcs();
            });
        });
    },

    // Override socketNotificationReceived method.

    /* socketNotificationReceived(notification, payload)
     * This method is called when a socket notification arrives.
     *
     * argument notification string - The identifier of the noitication.
     * argument payload mixed - The payload of the notification.
     */
    socketNotificationReceived: function(notification, payload) {
        var self = this;
        if (notification === 'CONFIG') {
            this.config = payload;
            let streams = Object.keys(this.config).filter(key => key.startsWith("stream"));
            if (this.config.rotateStreams &&
                this.config.shutdownDelay &&
                this.config.shutdownDelay < ((streams.length - 1) * this.config.rotateStreamsTimeout)) {
                let suggestedDelay = ((streams.length - 1) * this.config.rotateStreamsTimeout) + 2;
                console.warn("WARNING: shutdownDelay is shorter than the time it takes to make it through the loop. Consider increasing to " + suggestedDelay + "s.");
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
        if (notification === "PLAY_OMXSTREAM") {
            this.getOmxplayer(payload);
        }
        if (notification === "STOP_OMXSTREAM") {
            this.stopOmxplayer(payload);
        }
        if (notification === "STOP_ALL_OMXSTREAMS") {
            if (Object.keys(this.omxStream).length > 0) {
                this.stopAllOmxplayers();
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
    },
});