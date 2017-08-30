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

        // Add exit handler to allow a graceful restart.
        process.on('SIGINT', () => {
            console.log("Shutting down MMM-RTSPStream streams...");
            
            // Kill any running OMX Streams
            if ("omxStream" in this) {
                Object.keys(this.omxStream).forEach(s => {
                    this.stopOmxplayer(s);
                });
            }

            // Kill any FFMPEG strems that are running
            // { need to do anything here?? }

            // Wait 300ms and then exiting.
            setTimeout(function() {
                process.exit(0);
            }, 300);
        });
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
        var self = this;
        var opts = { detached: false,  stdio: 'ignore' };

        var omxCmd = `omxplayer`;

        var args = ["--live", "--video_queue", "4", "--fps", "30", 
                         this.config[payload.name].url];
        if (!("fullscreen" in payload)) {
            args.unshift("--win", `${payload.box.left}, ${payload.box.top}, ${payload.box.right}, ${payload.box.bottom}`);
        } else {
            if ("hdUrl" in this.config[payload.name]) {
                args.pop();
                args.push(this.config[payload.name].hdUrl);
            }
        }
        if (this.config[payload.name].protocol !== "udp") {
            args.unshift("--avdict", "rtsp_transport:tcp");
        }
        console.log(`Starting stream ${payload.name} with args: ${JSON.stringify(args,null,4)}`);
        // this.omxStream[payload.name] = child_process.spawn(omxCmd, args, opts);


        // PM2 Test
        var pm2 = require('pm2');
        var proc_name = "omx_" + payload.name;

        pm2.connect( (err) => {
          if (err) {
            console.error(err);
            process.exit(2);
          }

          // Stops the Daemon if it's already started
          pm2.list(function (err, list){        
            var errCB = function(err, apps) {
                if (err) { console.log(err); }
            };

            for (var proc in list) {
                if ("name" in list[proc] && list[proc].name === proc_name) {
                    if ("status" in list[proc] && list[proc].status === "online") {
                      console.log(`PM2: ${proc_name} already running. Stopping old instance...`);
                      pm2.stop(proc_name, errCB);
                    }
                }
            }
          });
          
          pm2.start({
            script    : "omxplayer",
            name      : proc_name,
            interpreter: 'bash',
            out_file: "/dev/null",
            //interpreterArgs: '-u',
            args      : args,
            //max_memory_restart : '100M'   // Optional: Restarts your app if it reaches 100Mo
          }, (err, proc) => {
            pm2.disconnect();   // Disconnects from PM2
            if (err) { throw err; }
          });
        });
        this.omxStream[payload.name] = proc_name;
        console.log(JSON.stringify(this.omxStream[payload.name]));
    },

    stopOmxplayer: function(name) {
        console.log(`Stopping stream ${name}`);
        // console.log(this.omxStream[name].pid);
        // this.kill(this.omxStream[name].pid);
        var pm2 = require('pm2');

        pm2.connect( (err) => {
          if (err) {
            console.error(err);
            process.exit(2);
          }

          pm2.stop(this.omxStream[name], function(err, apps) {
                pm2.disconnect();
                if (err) { console.log(err); }
          });
        });
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
