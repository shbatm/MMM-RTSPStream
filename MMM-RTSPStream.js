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

        console.log(`${this.name}: start() called.`, this.streams);
    },

    /* Setup Key Bindings for the MMM-KeyBindings module */
    setupKeyBindings: function () {
        this.currentKeyPressMode = this.config.keyBindingsMode;
        this.reverseKeyMap = {};
        Object.keys(this.config.keyBindings).forEach(key => this.reverseKeyMap[this.config.keyBindings[key]] = key);

        console.log(`${this.name}: setupKeyBindings() called.`, this.reverseKeyMap);
    },

    setupStreamRotation: function() {
        // Reference to function for manual transitions (TODO: FUTURE)
        this.manualTransition = this.rotateStream.bind(this);

        // Call the first stream
        this.manualTransition();


        console.log(`${this.name}: setupStreamRotation() called.`);

        if (this.config.rotateStreams && this.streams.length > 1) {
            // We set a timer to cause the stream rotation
            this.transitionTimer = setInterval(this.manualTransition, this.config.rotateStreamTimeout * 1000);
            console.log(`${this.name}: transitionTimer setup.`, this.config.rotateStreamTimeout * 1000);
        }
    },

    rotateStream: function () {
        if (this.currentIndex < (this.streams.length - 1)) {
            this.currentIndex ++;
        } else {
            this.currentIndex = 0;
        }
        console.log(`${this.name}: rotateStream() called.`, this.currentIndex);
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

    playBtnCallback: function () {
        console.log(`${this.name}: playBtnCallback() called. this.playStream: ${this.playStream}`);
        if (this.playStream) { this.pause(); } else { this.play(); }
    },


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

        console.log(`${this.name}: getDom() called. Loaded: ${this.loaded}; Suspended: ${this.suspended}`);

        if (this.loaded && !this.suspended) {
            wrapper.style.cssText = `width: ${this.config.moduleWidth}px; height:${this.config.moduleHeight}px`;
            wrapper.className = "MMM-RTSPStream wrapper";

            if (this.config.rotateStreams) {
                console.log(`${this.name}: getDom--Clearing streams.`, this.currentPlayers, this.config);
                // Clear out old timers and streams
                Object.keys(this.streams).forEach((key) => { 
                    if (key !== this.streams[this.currentIndex]) {
                        if (typeof this.config[key].snapshotTimer !== "undefined") {
                            clearInterval(this.config[key].snapshotTimer);
                            this.config[key].snapshotTimer = undefined;
                        } else if (key in this.currentPlayers) {
                            this.stopStream(key);
                        }
                    }
                });
            }

            var iw;
            if (this.playStream) {
                // Load the canvas and play the stream
                if (this.config.rotateStreams) {
                    if (!(this.streams[this.currentIndex] in this.currentPlayers)) {
                        iw = this.getInnerWrapper(this.streams[this.currentIndex]);
                        iw.appendChild(this.getStream(this.streams[this.currentIndex]));
                        iw.appendChild(this.getPlayPauseBtn());
                        wrapper.appendChild(iw);
                    }
                } else {
                    this.streams.forEach((stream) => {
                        var iw = this.getInnerWrapper(stream);
                        iw.appendChild(this.getStream(stream));
                        iw.appendChild(this.getPlayPauseBtn());
                        wrapper.appendChild(iw);
                        wrapper.appendChild(document.createElement("br"));
                    });
                }
            } else if (this.showSnapWhenPaused) {
                if (this.config.rotateStreams) {
                    iw = this.getInnerWrapper(this.streams[this.currentIndex]);
                    iw.appendChild(this.getSnapshot(this.streams[this.currentIndex]));
                    iw.appendChild(this.getPlayPauseBtn());
                    wrapper.appendChild(iw);
                } else {
                    this.streams.forEach((stream) => {
                        var iw = this.getInnerWrapper(stream);
                        iw.appendChild(this.getSnapshot(stream));
                        iw.appendChild(this.getPlayPauseBtn());
                        wrapper.appendChild(iw);
                        wrapper.appendChild(document.createElement("br"));
                    });
                }

                // TODO: Add setInterval for snapshot (will need separate function)
                // TODO: Add filters (invert colors)
            } else {
                // Show a placeholder
                wrapper.innerHTML = "Nothing to Show...";
            }
        }
        return wrapper;
    },

    getCanvasSize: function(streamConfig) {
        var s = '';
        if (typeof streamConfig.width !== "undefined") { s += "width: " + streamConfig.width + "px; "; }
        if (typeof streamConfig.height !== "undefined") { s += "height: " + streamConfig.height + "px; line-height: " + streamConfig.height + ";"; }
        return s;
    },

    getInnerWrapper: function(stream) {
        var innerWrapper = document.createElement("div");
        innerWrapper.className = "MMM-RTSPStream innerWrapper";
        innerWrapper.id = "iw_" + stream;
        return innerWrapper;
    },

    getStream: function(stream) {
        var canvas = document.createElement("canvas");
        canvas.id = "canvas_" + stream;
        canvas.cssText = this.getCanvasSize(this.config[stream]);
        var sUrl = `ws://${document.location.hostname}:${this.config[stream].port}`;
        var player = new JSMpeg.Player(sUrl, {canvas: canvas}); 
        this.currentPlayers[stream] = player;
        return canvas;
    },

    getSnapshot: function(stream) {
        // Show the snapshot instead of the stream
        var snapUrl = this.config[stream].snapshotUrl;
        if (snapUrl) {
            var img = document.createElement("img");
            img.id = "snapshot_" + stream;
            img.src = snapUrl;
            img.className = "MMM-RTSPStream canvas";
            img.style.cssText = this.getCanvasSize(this.config[stream]);
            this.config[stream].snapshotTimer = setInterval(function() {
                document.getElementById("snapshot_" + stream).src = snapUrl;
            }.bind({stream:stream, url:snapUrl}) , this.config[stream].snapshotRefresh * 1000);
            return img;
        } else {
            var pHolder = document.createElement("div");
            pHolder.className = "MMM-RTSPStream canvas";
            pHolder.style.cssText = this.getCanvasSize(this.config[stream]);
            pHolder.innerHTML = "No snapshot URL!";
        }
    },

    getPlayPauseBtn: function(stream) {
        function makeOnClickHandler() {
            return function () {
                self.playBtnCallback();
            };
        }

        var playBtnWrapper = document.createElement("div");
        playBtnWrapper.className = "control";

        var playBtnLabel = document.createElement("label");
        playBtnLabel.id = "playBtn" + stream;
        if (this.playStream) {
            playBtnLabel.innerHTML = '<i class="fa fa-pause-circle"></i>';
            playBtnLabel.onclick = makeOnClickHandler();
        } else {
            playBtnLabel.innerHTML = '<i class="fa fa-play-circle"></i>';
            playBtnLabel.onclick = makeOnClickHandler();
        }
        playBtnWrapper.appendChild(playBtnLabel);
        return playBtnWrapper;
    },

    play: function () {
        this.playStream = true;
        this.updateDom(self.config.animationSpeed);
        console.log(`${this.name}: play() called. PlayStream: ${this.playStream}`);
    },

    pause: function() {
        this.playStream = false;
        this.stopAllStreams();
        console.log(`${this.name}: pause() called. PlayStream: ${this.playStream}`);
    },

    stopStream: function(stream) {

        console.log(`${this.name}: stopStream() called. stream: ${stream}`);
        if (stream in this.currentPlayers) {
            this.currentPlayers[stream].destroy();
            delete this.currentPlayers[stream];
        }
    },

    stopAllStreams: function() {
        console.log(`${this.name}: stopAllStreams() called. currentPlayers: ${this.currentPlayers}`);
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
