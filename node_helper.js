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
const DataURI = require('datauri');
const datauri = new DataURI();
const psTree = require('ps-tree');
const child_process = require('child_process');

module.exports = NodeHelper.create({

    config: {},

    streams: {},

    omxStream: {},

    snapshots: {},

    start: function() {
        this.started = false;
        this.config = {};
    },

    stop: function() {
        console.log("Shutting down MMM-RTSPStream streams...");

        // Kill any running OMX Streams
        if ("omxStream" in this) {
            this.stopAllOmxplayers();
        }

        // Kill any FFMPEG strems that are running
        Object.keys(this.streams).forEach(s => this.streams[s].stopStream(0));
    },


    startListener: function(name) {
        if ((this.players.localPlayer === 'ffmpeg' || this.players.remotePlayer === 'ffmpeg') && this.config[name].url) {
            this.streams[name] = new Stream(this.config[name]);
            this.streams[name].start();
        }
    },

    getData: function(name) {
        // console.log("Getting data for "+name);
        var self = this;

        var snapUrl = this.config[name].snapshotUrl;

        if (!snapUrl) {
            console.log("No snapshotUrl given for " + this.config[name].name + ". Ignoring.");
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
        // console.log(this.omxStream[name].pid);
        // this.kill(this.omxStream[name].pid);
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
        delete this.omxStream[name];
    },

    stopAllOmxplayers: function() {
        console.log('Stopping all OMXPlayer Streams...');
        var pm2 = require('pm2');

        pm2.connect((err) => {
            if (err) {
                console.error(err);
            }

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
                    }
                };

                for (var proc in list) {
                    if ("name" in list[proc] && list[proc].name.startsWith("omx_")) {
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
            this.players = payload;
        }
        if (notification === 'STREAM_CONFIG') {
            if (!(payload.name in this.config)) {
                this.config[payload.name] = payload.config;
                this.startListener(payload.name);
            }
            this.sendSocketNotification("STARTED", payload.name);
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
            this.stopAllOmxplayers();
        }
    },

    kill: function(pid, signal, callback) {
        signal = signal || 'SIGKILL';
        callback = callback || function() {};
        var killTree = true;
        if (killTree) {
            psTree(pid, function(err, children) {
                [pid].concat(
                    children.map(function(p) {
                        return p.PID;
                    })
                ).forEach(function(tpid) {
                    try { process.kill(tpid, signal); } catch (ex) {}
                });
                callback();
            });
        } else {
            try { process.kill(pid, signal); } catch (ex) {}
            callback();
        }
    },

});
