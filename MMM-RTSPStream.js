/* global Module */

/* Magic Mirror
 * Module: MMM-RTSPStream
 *
 * By shbatm
 * MIT Licensed.
 */
/* jshint esversion: 6*/

Module.register("MMM-RTSPStream", {
    defaults: {
        autoStart: true,
        rotateStreams: true,
        rotateStreamTimeout: 10,  // Seconds
        showSnapWhenPaused: true,
        moduleWidth: 354,         // Set to mutiples of the camera widths to display side by side
        moduleHeight: 240,        // 
        animationSpeed: 1500,
        stream1: {
            name: 'Driveway Camera',
            url: 'rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov',
            snapshotUrl: '',
            snapshotRefresh: 10, // Seconds
            frameRate: "30",
            port: 9999,
            width: undefined,
            height: undefined,
            shutdownDelay: 10000,  // Miliseconds
            hideFfmpegOutput: true
        },            
        // MMM-KeyBindings mapping.
        keyBindingsMode: "DEFAULT",
        keyBindings: { Play: "MediaPlayPause" }
    },

    requiresVersion: "2.1.0", // Required version of MagicMirror

    currentPlayers: {},

    playStream: false,

    currentIndex: -1,

    streams: [],

    start: function() {
        var self = this;

        //Flag for check if module is loaded
        this.loaded = false;

        this.setupKeyBindings();

        Object.keys(this.config).filter(key => key.startsWith("stream")).forEach((key) => { 
            self.streams.push(key);
            if (self.config[key].url) {
                self.sendSocketNotification('CONFIG', self.config[key]);
            }
        });
    },

    /* Setup Key Bindings for the MMM-KeyBindings module */
    setupKeyBindings: function () {
        this.currentKeyPressMode = this.config.keyBindingsMode;
        this.reverseKeyMap = {};
        Object.keys(this.config.keyBindings).forEach(key => this.reverseKeyMap[this.config.keyBindings[key]] = key);
    },

    setupStreamRotation: function() {
        // Reference to function for manual transitions (TODO: FUTURE)
        this.manualTransition = this.rotateStream.bind(this);

        // Call the first stream
        this.manualTransition();

        if (this.config.rotateStreams && this.streams.length > 1) {
            // We set a timer to cause the stream rotation
            this.transitionTimer = setInterval(this.manualTransition, this.config.rotateStreamTimeout * 1000);
        }
    },

    rotateStream: function () {
        if (this.currentIndex < (this.streams.length - 1)) {
            this.currentIndex ++;
        } else {
            this.currentIndex = 0;
        }
        this.updateDom();
    },

    restartTimer: function () {
        // Restart the timer
        clearInterval(this.transitionTimer);
        this.transitionTimer = setInterval(this.manualTransition, this.config.rotateStreamTimeout * 1000);
    },

    /* suspend()
     * This method is called when a module is hidden.
     */
    suspend: function () {
        console.log(`${this.name} is suspended...`);
        this.suspended = true;
        if (typeof this.transitionTimer !== "undefined") {
            clearInterval(this.transitionTimer);
        }
        this.stopAllStreams();
    },

    /* resume()
     * This method is called when a module is shown.
     */
    resume: function () {
        console.log(`${this.name} has resumed...`);
        this.suspended = false;
        this.setupStreamRotation();
    },

    /*
     * getData
     * function example return data and show it in the module wrapper
     * get a URL request
     *
     */
    // getData: function() {
    //  var self = this;

    //  var urlApi = "https://jsonplaceholder.typicode.com/posts/1";
    //  var retry = true;

    //  var dataRequest = new XMLHttpRequest();
    //  dataRequest.open("GET", urlApi, true);
    //  dataRequest.onreadystatechange = function() {
    //      console.log(this.readyState);
    //      if (this.readyState === 4) {
    //          console.log(this.status);
    //          if (this.status === 200) {
    //              self.processData(JSON.parse(this.response));
    //          } else if (this.status === 401) {
    //              self.updateDom(self.config.animationSpeed);
    //              Log.error(self.name, this.status);
    //              retry = false;
    //          } else {
    //              Log.error(self.name, "Could not load data.");
    //          }
    //          if (retry) {
    //              self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
    //          }
    //      }
    //  };
    //  dataRequest.send();
    // },


    /* scheduleUpdate()
     * Schedule next update.
     *
     * argument delay number - Milliseconds before next update.
     *  If empty, this.config.updateInterval is used.
     */
    // scheduleUpdate: function(delay) {
    //     var nextLoad = this.config.updateInterval;
    //     if (typeof delay !== "undefined" && delay >= 0) {
    //         nextLoad = delay;
    //     }
    //     nextLoad = nextLoad ;
    //     var self = this;
    //     setTimeout(function() {
    //         self.getData();
    //     }, nextLoad);
    // },

    getDom: function() {
        var self = this;

        // create element wrapper for show into the module
        var wrapper = document.createElement("div");

        if (!this.loaded) {
            wrapper.innerHTML = "Loading "+this.name+"...";
            wrapper.className = "dimmed light small";
            return wrapper;
        }
        if (this.error) {
            wrapper.innerHTML = "Error loading data...";
            return wrapper;
        }

        if (this.loaded && !this.suspended) {
            wrapper.style.cssText = `width: ${this.config.moduleWidth}px; height:${this.config.moduleHeight}px`;
            if (this.playStream) {
                // Load the canvas and play the stream
                if (this.config.rotateStreams) {
                    // If rotating streams, check if a player exists, if not create it; also kill any other players
                    Object.keys(this.currentPlayers).filter(key => key != this.streams[this.currentIndex]).forEach((key) => {
                        this.stopStream(this.streams[this.currentIndex]);
                    });
                    if (!(this.streams[this.currentIndex] in this.currentPlayers)) {
                        wrapper.appendChild(getStream(this.streams[this.currentIndex]));
                    }
                } else {
                    this.streams.forEach(stream => { wrapper.appendChild(getStream(stream)); });
                }
            } else if (this.showSnapWhenPaused) {
                // Show the snapshot instead of the stream
                var snapUrl = this.config[this.streams[this.currentIndex]].snapshotUrl;
                if (snapUrl) {
                    var img = document.createElement("img");
                    img.id = "snapshot_" + this.streams[this.currentIndex];
                    img.src = snapUrl;
                    img.style.cssText = this.getCanvasSize(this.config[this.streams[this.currentIndex]]);
                    wrapper.appendChild(img);
                } else {
                    wrapper.innerHTML = "No snapshot URL";
                }
                // TODO: Add setInterval for snapshot (will need separate function)
                // TODO: Add filters (invert colors)
            } else {
                // Show a placeholder
                wrapper.innerHTML = "Nothing to Show...";
            }
        }
        wrapper.appendChild(document.createElement("br"));
        return wrapper;
    },

    getCanvasSize: function(streamConfig) {
        var s = '';
        if (typeof streamConfig.width !== "undefined") { s += "width: " + streamConfig.width + "px; "; }
        if (typeof streamConfig.height !== "undefined") { s += "height: " + streamConfig.height + "px; "; }
        return s;
    },

    getStream: function(stream) {
        var canvas = document.createElement("canvas");
        canvas.id = "canvas_" + stream;
        canvas.cssText = this.getCanvasSize(this.config[this.streams[this.currentIndex]]);
        var sUrl = `ws://${document.location.hostname}:${this.config[stream].port}`;
        var player = new JSMpeg.Player(sUrl, {canvas: canvas}); 
        this.currentPlayers[stream] = player;
        return canvas;
    },

    play: function () {
        this.playStream = true;
        this.updateDom(self.config.animationSpeed);
    },

    pause: function() {
        this.playStream = false;
        this.stopAllStreams();
    },

    stopStream: function(stream) {
        if (stream in this.currentPlayers) {
            this.currentPlayers[stream].destroy();
            delete this.currentPlayers[stream];
        }
    },

    stopAllStreams: function() {
        Object.keys(this.currentPlayers).forEach(key => this.currentPlayers[key].destroy());
        this.currentPlayers = {};
        this.updateDom();
    },

    getScripts: function() {
        return ['jsmpeg.min.js'];
    },

    notificationReceived: function (notification, payload, sender) {
        if (notification === 'DOM_OBJECTS_CREATED') {

        }

        // Handle KEYPRESS events from the MMM-KeyBindings Module
        if (notification === "KEYPRESS_MODE_CHANGED") {
            this.currentKeyPressMode = payload;
        }
        // if (notification === "KEYPRESS") {
        //  console.log(payload);
        // }
        if (notification === "KEYPRESS" && (this.currentKeyPressMode === this.config.keyBindingsMode) && 
                payload.KeyName in this.reverseKeyMap) {
            if (payload.KeyName === this.config.keyBindings.Play) {
                if (this.playStream) { this.pause(); } else { this.play(); }
            }
        }
    },

    // processData: function(data) {
    //     var self = this;
    //     this.dataRequest = data;
    //     if (this.loaded === false) { self.updateDom(self.config.animationSpeed) ; }
    //     this.loaded = true;

    //     // the data if load
    //     // send notification to helper
    //     this.sendSocketNotification("MMM-RTSPStream-NOTIFICATION_TEST", data);
    // },

    // socketNotificationReceived from helper
    socketNotificationReceived: function (notification, payload) {
        if (notification === "STARTED") {
            if (!this.loaded) { this.loaded = true; }
            if (this.config.autoStart) { 
                this.playStream = true;
                this.resume(); 
            }
        }
    },
});
