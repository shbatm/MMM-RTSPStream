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

    startListener: function(name) {
        if (this.config[name].url) {
            this.streams[name] = new Stream(this.config[name]); 
            this.streams[name].startListener();
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
            }, function (error, response, body) {
                if (!error && typeof response !== "undefined" && response.statusCode == 200) {
                    self.sendSocketNotification("SNAPSHOT", { name: this.callerName, image: true, buffer: 'data:image/jpeg;base64,' + body.toString('base64') });
                } else if (error || response.statusCode === 401) {
                    self.sendSocketNotification("DATA_ERROR_" + this.callerName, error);
                    console.error(self.name, error);
                } else {
                    console.error(self.name, "Could not load data.");
                }
            }.bind({callerName:name})
            ); //.pipe(fs.createWriteStream('/home/pi/snapshot.jpg').on("close", function() { console.log("done"); } ) ); // Debugging code to write file to disk
        }
        this.snapshots[name] = setTimeout(function() { self.getData(name); }, this.config[name].snapshotRefresh * 1000);
    },

    getOmxplayer: function(payload) {
        console.log(`Starting stream ${payload.name}`);
        var self = this;
        var opts = { detached: false,  stdio: 'ignore' };

        var omxCmd = `omxplayer`;

        var args = ["--live", "--video_queue", "4", "--fps", "30", "--win",
                         `${payload.box.left}, ${payload.box.top}, ${payload.box.right}, ${payload.box.bottom}`, 
                         this.config[payload.name].url];
        if (this.config[payload.name].protocol !== "udp") {
            args.unshift("--avdict", "rtsp_transport:tcp");
        }
        this.omxStream[payload.name] = child_process.spawn(omxCmd, args, opts);
    },

    stopOmxplayer: function(name) {
        console.log(`Stopping stream ${name}`);
        console.log(this.omxStream[name].pid);
        this.kill(this.omxStream[name].pid);
        delete this.omxStream[name]; 
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
    },

    kill: function (pid, signal, callback) {
        signal   = signal || 'SIGKILL';
        callback = callback || function () {};
        var killTree = true;
        if(killTree) {
            psTree(pid, function (err, children) {
                [pid].concat(
                    children.map(function (p) {
                        return p.PID;
                    })
                ).forEach(function (tpid) {
                    try { process.kill(tpid, signal); }
                    catch (ex) { }
                });
                callback();
            });
        } else {
            try { process.kill(pid, signal); }
            catch (ex) { }
            callback();
        }
    },
});
