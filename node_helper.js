/* Magic Mirror
 * Node Helper: MMM-RTSPStream
 *
 * By shbatm
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
var Stream = require('node-rtsp-stream-es6');
var request = require('request');

module.exports = NodeHelper.create({

    config: {},

    streams: {},

    start: function() {
        this.started = false;
        this.config = {};
    },

    startListener: function(name) {
        streams[name] = new Stream(this.config.name); 
        streams[name].startListener();
    },


    /* FUTURE: Allow ability to make calls for the snapshots from the node_helper
     * Instead of grabbing the image directly from the browser.
     * This function is not currently used.
     */
    getData: function(name) {
        // console.log("Getting data for "+name);
        var self = this;
        
        var snapUrl = this.config[name].snapshotUrl;

        if (!snapUrl) {
            console.log("No snapshotUrl given for " + this.config[name].name);
            return;
        }
                
        request({
            url: snapUrl,
            method: 'GET',
        }, function (error, response, body) {
            // console.log("Received response for "+this.callerName);
            if (!error && response.statusCode == 200) {
                self.sendSocketNotification("DATA_" + this.callerName, body);
            } else if (response.statusCode === 401) {
                self.sendSocketNotification("DATA_ERROR_" + this.callerName, error);
                console.error(self.name, error);
            } else {
                console.error(self.name, "Could not load data.");
            }
        }.bind({callerName:name})
        );
        setTimeout(function() { self.getData(name); }, this.config[name].snapshotRefresh * 1000);
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
            if (!(payload.name in self.config)) {
                self.config[payload.name] = payload;
                self.startListener(payload.name);
                self.sendSocketNotification("STARTED", payload.name);
            }
        }
    },
});
