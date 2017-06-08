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
        moduleWidth: 384,         // Width = (Stream Width + 30px margin + 2px border) * # of Streams Wide
        moduleHeight: 272,        // Height = (Stream Height + 30px margin + 2px border) * # of Streams Tall
        animationSpeed: 1500,
        stream1: {
            name: 'BigBuckBunny Test',
            url: 'rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov',
            snapshotType: 'url', // 'url' or 'file'
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

    playing: false,

    currentIndex: -1,

    currentStream: '',

    streams: {},

    start: function() {
        var self = this;

        //Flag for check if module is loaded
        this.loaded = false;

        this.setupKeyBindings();

        Object.keys(this.config).filter(key => key.startsWith("stream")).forEach((key) => { 
            self.streams[key] = { playing: false };
            if (self.config[key].url || self.config[key].snapshotUrl) {
                self.sendSocketNotification('CONFIG', { name: key, config: self.config[key] });
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
        console.log(`${this.name}: setupStreamRotation() called. autoStart:${this.config.autoStart}`);
        this.playing = this.config.autoStart;

        // Reference to function for manual transitions (TODO: FUTURE)
        this.manualTransition = this.rotateStream.bind(this);

        // Call the first stream
        this.manualTransition();

        if (this.config.rotateStreams && Object.keys(this.streams).length > 1) {
            // We set a timer to cause the stream rotation
            this.transitionTimer = setInterval(this.manualTransition, this.config.rotateStreamTimeout * 1000);
            console.log(`${this.name}: transitionTimer setup.`, this.config.rotateStreamTimeout * 1000);
        }
    },

    rotateStream: function () {
        var k = Object.keys(this.streams);
        var lastStream = this.currentStream;
        if (this.currentIndex < (k.length - 1)) {
            this.currentIndex ++;
            this.currentStream = k[this.currentIndex];
        } else {
            this.currentIndex = 0;
            this.currentStream = k[0];
        }

        if (this.playing) {
            if (lastStream) { this.stopStream(lastStream); }
            this.playStream(this.currentStream);
        } else {
            if (lastStream) { this.sendSocketNotification("SNAPSHOT_STOP", lastStream); }
            this.playSnapshots(this.currentStream);
        }

        console.log(`${Math.floor(Date.now() / 1000)}: ${this.name}: rotateStream() called.`, lastStream, this.currentStream);
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
        this.stopAllStreams(false);
    },

    /* resume()
     * This method is called when a module is shown.
     */
    resume: function () {
        console.log(`${this.name} has resumed...`);
        this.suspended = false;
        if (this.loaded) { 
            if (this.config.rotateStreams) {
                this.setupStreamRotation();
            } else if (this.config.autoStart) {
                this.playAll();
            } else {
                Object.keys(this.streams).forEach(s => this.playSnapshots(s));
            }
        }
    },

    playBtnCallback: function (s) {
        console.log(`${this.name}: playBtnCallback() called for ${s}`);
        if (this.config.rotateStreams) {
            if (this.playing) {
                this.stopStream(this.currentStream);
                this.playSnapshots(this.currentStream);
            } else {
                this.sendSocketNotification("SNAPSHOT_STOP", this.currentStream);
                this.playStream(this.currentStream);
            }
        } else { 
            if (this.streams[s].playing) { 
                this.stopStream(s);
                this.playSnapshots(s);
            } else { 
                this.sendSocketNotification("SNAPSHOT_STOP", s);
                this.playStream(s);
            }
        }
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
                iw = this.getInnerWrapper('');
                iw.appendChild(this.getCanvas(''));
                iw.appendChild(this.getPlayPauseBtn(''));
                wrapper.appendChild(iw);
            } else {
                Object.keys(this.streams).forEach(stream => {
                    iw = this.getInnerWrapper(stream);
                    iw.appendChild(this.getCanvas(stream));
                    iw.appendChild(this.getPlayPauseBtn(stream));
                    wrapper.appendChild(iw);
                });
            }
            wrapper.appendChild(document.createElement("br"));
        }
        return wrapper;
    },
   
    getCanvasSize: function(streamConfig) {
        var s = '';
        if (typeof streamConfig.width !== "undefined") { s += "width: " + streamConfig.width + "px; "; }
        if (typeof streamConfig.height !== "undefined") { s += "height: " + streamConfig.height + "px; line-height: " + streamConfig.height + ";"; }
        return s;
    },

    getCanvas: function(stream) {
        var canvas = document.createElement("canvas");
        canvas.id = "canvas_" + stream;
        canvas.className = "MMM-RTSPStream canvas";
        if (stream) { canvas.cssText = this.getCanvasSize(this.config[stream]); }
        return canvas;
    },

    getInnerWrapper: function(stream) {
        var innerWrapper = document.createElement("div");
        innerWrapper.className = "MMM-RTSPStream innerWrapper";
        innerWrapper.id = "iw_" + stream;
        return innerWrapper;
    },

    getPlayPauseBtn: function(stream, force_visible=false) {
        var self = this;

        function makeOnClickHandler(s) {
            return function () {
                self.playBtnCallback(s);
            };
        }

        var playBtnWrapper = document.createElement("div");
        playBtnWrapper.className = "control";
        playBtnWrapper.onclick = makeOnClickHandler(stream);
        playBtnWrapper.id = "playBtnWrapper_" + stream;

        var playBtnLabel = document.createElement("label");
        playBtnLabel.id = "playBtnLabel_" + stream;
        playBtnLabel.innerHTML = '<i class="fa fa-play-circle"></i>';
        playBtnWrapper.appendChild(playBtnLabel);
        return playBtnWrapper;
    },

    playStream: function(stream) {
        var canvasId = (this.config.rotateStreams) ? "canvas_" : "canvas_" + stream;
        var canvas = document.getElementById(canvasId);
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (stream in this.currentPlayers) {
            this.currentPlayers[stream].destroy();
        }
        var sUrl = `ws://${document.location.hostname}:${this.config[stream].port}`;
        var player = new JSMpeg.Player(sUrl, {canvas: canvas}); 
        this.currentPlayers[stream] = player;
        this.streams[stream].playing = true;
        this.playing = true;
        this.updatePlayPauseBtn(stream);
    },

    playSnapshots: function(stream) {
        // Show the snapshot instead of the stream
        var snapUrl = this.config[stream].snapshotUrl;
        var canvasId = (this.config.rotateStreams) ? "canvas_" : "canvas_" + stream;
        var canvas = document.getElementById(canvasId);
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (snapUrl && this.config.showSnapWhenPaused) {
            this.sendSocketNotification("SNAPSHOT_START", stream);
            this.updatePlayPauseBtn(stream);
        } else {
            this.updatePlayPauseBtn(stream, true);
            ctx.font = "16px Roboto Condensed";
            ctx.fillStyle = "white";
            ctx.fillText(this.config[stream].name,10,25);
        }
    },

    updatePlayPauseBtn(stream, force_visible=false) {
        var buttonId = (this.config.rotateStreams) ? "playBtnLabel_" : "playBtnLabel_" + stream;
        var button = document.getElementById(buttonId);
        if (stream !== '' && this.streams[stream].playing) {
            button.innerHTML = '<i class="fa fa-pause-circle"></i>';
        } else {
            button.innerHTML = '<i class="fa fa-play-circle"></i>';
        }

        if (force_visible) {
            button.style.cssText = "opacity: 0.6;";
            button.parentElement.style.cssText = "opacity: 1;";
        } else {
            button.style.cssText = '';
            button.parentElement.style.cssText = '';
        }
    },

    playAll: function () {
        this.playing = true;
        Object.keys(this.streams).forEach(s => {
            this.streams[s].playing = true;
            this.playStream(s);
            this.sendSocketNotification("SNAPSHOT_STOP", s);
        });    
        console.log(`${this.name}: playAll() called.`);
    },

    stopStream: function(stream) {
        console.log(`${this.name}: stopStream() called. stream: ${stream}`, this.currentPlayers);
        if (stream in this.currentPlayers) {
            this.currentPlayers[stream].destroy();
            delete this.currentPlayers[stream];
        }
        this.streams[stream].playing = false;
        if (Object.keys(this.currentPlayers).length === 0) {
            this.playing = false;
        }
    },

    stopAllStreams: function(startSnapshots=true) {
        console.log(`${this.name}: stopAllStreams() called. currentPlayers: ${this.currentPlayers}`);
        this.playing = false;
        Object.keys(this.currentPlayers).forEach(key => this.currentPlayers[key].destroy());
        this.currentPlayers = {};
        Object.keys(this.streams).forEach(s => {
            this.streams[s].playing = false;
            if (startSnapshots) { this.playSnapshots(s); }
            this.updatePlayPauseBtn(s);
        });
    },

    getScripts: function() {
        return ['jsmpeg.min.js'];
    },

    getStyles: function() {
        return [`${this.name}.css`, 'font-awesome.css'];
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
                if (this.config.rotateStreams) {
                    if (this.playing) {
                        this.stopStream(this.currentStream);
                        this.playSnapshots(this.currentStream);
                    } else {
                        this.sendSocketNotification("SNAPSHOT_STOP", this.currentStream);
                        this.playStream(this.currentStream);
                    }
                } else { 
                    if (this.playing) { this.stopAllStreams(); } else { this.playAll(); }
                }
            }
        }
    },

    // socketNotificationReceived from helper
    socketNotificationReceived: function (notification, payload) {
        if (notification === "STARTED") {
            if (!this.loaded) { 
                this.loaded = true;
                this.suspended = false;
                this.updateDom(this.config.animationSpeed);
                setTimeout(() => this.resume(), 1000);
            }
        }
        if (notification === "SNAPSHOT") {
            if (payload.image) {
                var canvasId = (this.config.rotateStreams) ? "canvas_" : "canvas_" + payload.name;
                var canvas = document.getElementById(canvasId);
                var ctx = canvas.getContext('2d');
                var img = new Image();
                img.onload = () => {
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = payload.buffer;
            }
        }
    },
});
