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
var fs = require('fs');
const DataURI = require('datauri');
const datauri = new DataURI();

module.exports = NodeHelper.create({

    config: {},

    streams: {},

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
    },
});
