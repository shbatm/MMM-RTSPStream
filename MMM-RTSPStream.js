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
        rotateStreamTimeout: 10, // Seconds
        showSnapWhenPaused: true,
        localPlayer: "omxplayer", // "omxplayer" or "ffmpeg"
        remotePlayer: "none", // "ffmpeg" or "none"
        remoteSnaps: true, // Show remote snapshots
        moduleWidth: 384, // Width = (Stream Width + 30px margin + 2px border) * # of Streams Wide
        moduleHeight: 272, // Height = (Stream Height + 30px margin + 2px border) * # of Streams Tall
        moduleOffset: 0, // Offset to align OMX player windows
        animationSpeed: 1500,
        stream1: {
            name: 'BigBuckBunny Test',
            url: 'rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov',
            snapshotType: 'url', // 'url' or 'file'
            snapshotUrl: '',
            snapshotRefresh: 10, // Seconds
            protocol: "tcp", // 'tcp' or 'udp'
            frameRate: "30",
            ffmpegPort: 9999,
            width: undefined,
            height: undefined,
            shutdownDelay: 10000, // Miliseconds
            hideFfmpegOutput: true
        },
        // MMM-KeyBindings mapping.
        keyBindingsMode: "DEFAULT",
        keyBindings: { Play: "MediaPlayPause", Previous: "MediaPreviousTrack", Next: "MediaNextTrack", Select: "Enter" },
        kbMultiInstance: true,
    },

    requiresVersion: "2.1.0", // Required version of MagicMirror

    playing: false,

    currentIndex: -1,

    currentStream: '',

    streams: {},

    start: function() {
        var self = this;

        //Flag for check if module is loaded
        this.loaded = false;

        this.setupKeyBindings();

        this.sendSocketNotification('CONFIG', { localPlayer: this.config.localPlayer, remotePlayer: this.config.remotePlayer });

        Object.keys(this.config).filter(key => key.startsWith("stream")).forEach((key) => {
            self.streams[key] = { playing: false };
            if (self.config[key].url || self.config[key].snapshotUrl) {
                self.sendSocketNotification('STREAM_CONFIG', { name: key, config: self.config[key] });
            }
        });
    },

    /* Setup Key Bindings for the MMM-KeyBindings module */
    setupKeyBindings: function() {
        this.currentKeyPressMode = "DEFAULT";
        if (typeof this.config.kbMultiInstance === undefined) {
            this.config.kbMultiInstance = true;
        }
        this.kbInstance = (["localhost", "127.0.0.1", "::1", "::ffff:127.0.0.1", undefined, "0.0.0.0"].indexOf(
            window.location.hostname) > -1) ? "SERVER" : "LOCAL";
        this.reverseKBMap = {};
        for (var eKey in this.config.keyBindings) {
            if (this.config.keyBindings.hasOwnProperty(eKey)) {
                this.reverseKBMap[this.config.keyBindings[eKey]] = eKey;
            }
        }
    },


    setupStreamRotation: function() {
        this.playing = this.config.autoStart;

        // Reference to function for manual transitions (TODO: FUTURE)
        this.manualTransition = this.rotateStream.bind(this);

        // Call the first stream
        this.manualTransition();

        if (this.config.rotateStreams && Object.keys(this.streams).length > 1 && this.config.rotateStreamTimeout > 0) {
            // We set a timer to cause the stream rotation
            this.transitionTimer = setInterval(this.manualTransition, this.config.rotateStreamTimeout * 1000);
        }
    },

    rotateStream: function(goToIndex = -1, goDirection = 0) {
        var k = Object.keys(this.streams);
        var ps = [];
        var resetCurrentIndex = k.length;
        var lastStream = this.currentStream;

        // Update the current index
        if (goToIndex === -1) { // Go to a specific slide?
            if (goDirection === 0) {
                this.currentIndex += 1; // Normal Transition, Increment by 1
            } else {
                this.currentIndex += goDirection; // Told to go a specific direction
            }
            if (this.currentIndex >= resetCurrentIndex) { // Wrap-around back to beginning
                this.currentIndex = 0;
            } else if (this.currentIndex < 0) {
                this.currentIndex = resetCurrentIndex - 1; // Went too far backwards, wrap-around to end
            }
        } else if (goToIndex >= 0 && goToIndex < resetCurrentIndex) {
            this.currentIndex = goToIndex; // Go to a specific slide if in range
        }

        this.currentStream = k[this.currentIndex];

        if (this.playing) {
            if (lastStream) { this.stopStream(lastStream); }
            ps = this.playStream(this.currentStream);
            if (ps.length > 0) { this.sendSocketNotification("PLAY_OMXSTREAM", ps); }

        } else {
            if (lastStream) { this.sendSocketNotification("SNAPSHOT_STOP", lastStream); }
            this.playSnapshots(this.currentStream);
        }
    },

    restartTimer: function() {
        if (this.config.rotateStreams && Object.keys(this.streams).length > 1 && this.config.rotateStreamTimeout > 0) {
            // Restart the timer
            clearInterval(this.transitionTimer);
            this.transitionTimer = setInterval(this.manualTransition, this.config.rotateStreamTimeout * 1000);
        }
    },

    /* suspend()
     * This method is called when a module is hidden.
     */
    suspend: function() {
        console.log(`${this.name} is suspended...`);
        this.suspended = true;
        this.stopAllStreams(false);
        if (this.selectedStream) { this.selectStream(undefined, true); }
    },

    /* resume()
     * This method is called when a module is shown.
     */
    resume: function() {
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

    playBtnCallback: function(s) {
        var ps = [];
        if (this.config.rotateStreams) {
            if (this.playing) {
                this.stopStream(this.currentStream);
                this.playSnapshots(this.currentStream);
            } else {
                this.sendSocketNotification("SNAPSHOT_STOP", this.currentStream);
                ps = this.playStream(this.currentStream);
                if (ps.length > 0) { this.sendSocketNotification("PLAY_OMXSTREAM", ps); }
            }
        } else {
            if (this.streams[s].playing) {
                this.stopStream(s);
                this.playSnapshots(s);
            } else {
                this.sendSocketNotification("SNAPSHOT_STOP", s);
                ps = this.playStream(s);
                if (ps.length > 0) { this.sendSocketNotification("PLAY_OMXSTREAM", ps); }
            }
        }
    },

    playBtnDblClickCB: function(s) {
        if (this.kbInstance === "SERVER" && !this.streams[s].playing) {
            var ps = this.playStream(s, true);
            if (ps.length > 0) { this.sendSocketNotification("PLAY_OMXSTREAM", ps); }
        } else {
            this.playBtnCallback(s);
        }
    },

    getDom: function() {
        var self = this;

        // create element wrapper for show into the module
        var wrapper = document.createElement("div");

        if (!this.loaded) {
            wrapper.innerHTML = "Loading " + this.name + "...";
            wrapper.className = "dimmed light small";
            return wrapper;
        }
        if (this.error) {
            wrapper.innerHTML = "Error loading data...";
            return wrapper;
        }

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
        // if (stream) { canvas.cssText = this.getCanvasSize(this.config[stream]); }
        return canvas;
    },

    getInnerWrapper: function(stream) {
        var innerWrapper = document.createElement("div");
        innerWrapper.className = "MMM-RTSPStream innerWrapper";
        if (stream) { innerWrapper.style.cssText = this.getCanvasSize(this.config[stream]); } else { innerWrapper.style.cssText = this.getCanvasSize(this.config.stream1); }
        innerWrapper.id = "iw_" + stream;
        return innerWrapper;
    },

    getPlayPauseBtn: function(stream, force_visible = false) {
        var self = this;

        function makeOnClickHandler(s) {
            return function() {
                self.playBtnCallback(s);
            };
        }

        function makeOnDblClickHandler(s) {
            return function() {
                self.playBtnDblClickCB(s);
            };
        }

        var playBtnWrapper = document.createElement("div");
        playBtnWrapper.className = "control";
        playBtnWrapper.onclick = makeOnClickHandler(stream);
        playBtnWrapper.oncontextmenu = makeOnDblClickHandler(stream);
        playBtnWrapper.id = "playBtnWrapper_" + stream;

        var playBtnLabel = document.createElement("label");
        playBtnLabel.id = "playBtnLabel_" + stream;
        playBtnLabel.innerHTML = '<i class="fa fa-play-circle"></i>';
        playBtnWrapper.appendChild(playBtnLabel);
        return playBtnWrapper;
    },

    updatePlayPauseBtn(stream, force_visible = false) {
        var buttonId = (this.config.rotateStreams) ? "playBtnLabel_" : "playBtnLabel_" + stream;
        var button = document.getElementById(buttonId);
        if (!button) {
            // If not ready yet, retry in 1 second.
            setTimeout(() => this.updatePlayPauseBtn(stream, force_visible), 1000);
            return;
        }
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

    playStream: function(stream, fullscreen = false, absPosition=undefined) {
        var canvasId = (this.config.rotateStreams) ? "canvas_" : "canvas_" + stream;
        var canvas = document.getElementById(canvasId);
        var omxPayload = [];

        if (this.streams[stream].playing) {
            this.stopStream(stream);
        }

        if (this.kbInstance === "SERVER" && this.config.localPlayer === "omxplayer") {
            var rect = canvas.getBoundingClientRect();
            var offset = {};
            if (typeof this.config.moduleOffset === "object") {
                offset.left = ("left" in this.config.moduleOffset) ? this.config.moduleOffset.left : 0;
                offset.top = ("top" in this.config.moduleOffset) ? this.config.moduleOffset.top : 0;
            } else {
                offset.left = this.config.moduleOffset;
                offset.top = this.config.moduleOffset;
            }
            var box = {};
            if ("absPosition" in this.config[stream]) {
                box = this.config[stream].absPosition;
            } else if (typeof absPosition !== "undefined") {
                box = absPosition;
            } else {
                box = {
                    top: Math.round(rect.top + offset.top), // Compensate for Margins 
                    right: Math.round(rect.right + offset.left), // Compensate for Margins
                    bottom: Math.round(rect.bottom + offset.top), // Compensate for Margins
                    left: Math.round(rect.left + offset.left) // Compensate for Margins
                };
            }
            var payload = {
                name: stream,
                box: box
            };
            if (fullscreen) { payload.fullscreen = true; }
            omxPayload.push(payload);
        } else {
            var ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var sUrl = `ws://${document.location.hostname}:${this.config[stream].ffpmegPort}`;
            var player = new JSMpeg.Player(sUrl, { canvas: canvas, disableGl: true, audio: false });
            this.streams[stream].player = player;
        }

        this.streams[stream].playing = true;
        this.playing = true;
        this.updatePlayPauseBtn(stream);
        return omxPayload;
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
            ctx.fillText(this.config[stream].name, 10, 25);
        }
    },

    playAll: function() {
        var ps = [];
        Object.keys(this.streams).forEach(s => {
            if (this.kbInstance === "SERVER" || (this.kbInstance === "LOCAL" && this.config.remotePlayer === "ffmpeg")) {
                var res = this.playStream(s);
                if (res.length > 0) {
                    ps = ps.concat(res);
                }
                if (!(this.kbInstance === "SERVER" && this.config.remoteSnaps)) {
                    this.sendSocketNotification("SNAPSHOT_STOP", s);
                }
            }
        });
        if (ps.length > 0) { this.sendSocketNotification("PLAY_OMXSTREAM", ps); }
    },

    stopStream: function(stream, omxStopAll=false) {
        if (this.streams[stream].playing) {
            if (this.kbInstance === "SERVER" && this.config.localPlayer === "omxplayer" && !omxStopAll) {
                this.sendSocketNotification("STOP_OMXSTREAM", stream);
            } else if ("player" in this.streams[stream]) {
                this.streams[stream].player.destroy();
                delete this.streams[stream].player;
            }
            this.streams[stream].playing = false;
        }

        if (Object.keys(this.streams).filter(s => { return s.playing; }).length === 0) {
            this.playing = false;
        }
    },

    stopAllStreams: function(startSnapshots = true) {
        var omxStopAll = false;
        if (this.kbInstance === "SERVER" && this.config.localPlayer === "omxplayer") {
            this.sendSocketNotification("STOP_ALL_OMXSTREAMS", "");
            omxStopAll = true;
        }
        Object.keys(this.streams).forEach(s => {
            this.stopStream(s, omxStopAll);
            if (startSnapshots) {
                this.playSnapshots(s);
            } else {
                this.sendSocketNotification("SNAPSHOT_STOP", s);
            }
            this.updatePlayPauseBtn(s);
        });
    },

    toggleStreams: function(payload) {
        var ps = [];
        if (this.config.rotateStreams) {
            if (this.playing) {
                this.stopStream(this.currentStream);
                this.playSnapshots(this.currentStream);
            } else {
                if ((this.kbInstance === "SERVER" && !this.config.remoteSnaps) ||
                    (this.kbInstance === "LOCAL" && this.config.remotePlayer === "ffmpeg")) {
                    this.sendSocketNotification("SNAPSHOT_STOP", this.currentStream);
                }
                if (this.kbInstance === "SERVER" || (this.kbInstance === "LOCAL" && this.config.remotePlayer === "ffmpeg")) {
                    ps = this.playStream(this.currentStream);
                }
            }
        } else if (!this.selectedStream) {
            if (this.playing) { this.stopAllStreams(); } else { this.playAll(); }
        } else {
            if (this.streams[this.selectedStream].playing) {
                this.stopStream(this.selectedStream);
                this.playSnapshots(this.selectedStream);
            } else {
                if ((this.kbInstance === "SERVER" && !this.config.remoteSnaps) ||
                    (this.kbInstance === "LOCAL" && this.config.remotePlayer === "ffmpeg")) {
                    this.sendSocketNotification("SNAPSHOT_STOP", this.selectedStream);
                }
                if (this.kbInstance === "SERVER" && payload.KeyState === "KEY_LONGPRESSED") {
                    ps = this.playStream(this.selectedStream, true);
                } else if (this.kbInstance === "SERVER" || (this.kbInstance === "LOCAL" && this.config.remotePlayer === "ffmpeg")) {
                    ps = this.playStream(this.selectedStream);
                }
            }
        }
        if (ps.length > 0) { this.sendSocketNotification("PLAY_OMXSTREAM", ps); }
    },

    getScripts: function() {
        return ['jsmpeg.min.js'];
    },

    getStyles: function() {
        return [`${this.name}.css`, 'font-awesome.css'];
    },

    notificationReceived: function(notification, payload, sender) {
        var ps = [];
        if (this.validateKeyPress(notification, payload)) { return; }

        if (notification === 'DOM_OBJECTS_CREATED') {

        }
        // Handle USER_PRESENCE events from the MMM-PIR-sensor Module
        if (notification === "USER_PRESENCE") {
            this.resume();
            if (payload) {} else {
                this.suspend();
            }
        }
        if (this.kbInstance === "SERVER") {
            if (notification === 'RTSP-PLAY') {
                if (payload === 'all') {
                    this.playAll();
                } else {
                    ps = this.playStream(payload);
                }
            }
            if (notification === 'RTSP-PLAY-FULLSCREEN') {
                ps = this.playStream(payload, true);
            }
            if (notification === 'RSTP-PLAY-WINDOW') {
                ps = this.playStream(payload.name, false, payload.box);
            }
            if (notification === 'RTSP-STOP') {
                if (payload === 'all') {
                    this.stopAllStreams();
                } else {
                    this.stopStream(payload);
                }
            }
        }
        if (ps.length > 0) { this.sendSocketNotification("PLAY_OMXSTREAM", ps); }
    },

    validateKeyPress: function(notification, payload) {
        // Handle KEYPRESS mode change events from the MMM-KeyBindings Module
        if (notification === "KEYPRESS_MODE_CHANGED") {
            this.currentKeyPressMode = payload;
            return true;
        }

        // Uncomment line below for diagnostics & to confirm keypresses are being recieved
        // if (notification === "KEYPRESS") { console.log(payload); }

        // Validate Keypresses
        if (notification === "KEYPRESS" && this.currentKeyPressMode === this.config.keyBindingsMode) {
            if (this.config.kbMultiInstance && payload.Sender !== this.kbInstance) {
                return false; // Wrong Instance
            }
            if (!(payload.KeyName in this.reverseKBMap)) {
                return false; // Not a key we listen for
            }
            this.validKeyPress(payload);
            return true;
        }

        return false;
    },

    validKeyPress: function(kp) {
        // Example for responding to "Left" and "Right" arrow
        if (kp.KeyName === this.config.keyBindings.Play) {
            this.toggleStreams(kp);
        }
        if (kp.KeyName === this.config.keyBindings.Next) {
            if (this.config.rotateStreams) {
                this.manualTransition(undefined, 1);
                this.restartTimer();
            } else {
                this.selectStream(1);
            }
        } else if (kp.KeyName === this.config.keyBindings.Previous) {
            if (this.config.rotateStreams) {
                this.manualTransition(undefined, -1);
                this.restartTimer();
            } else {
                this.selectStream(-1);
            }
        }
    },

    selectedStream: '',

    selectStream: function(direction = 1, clear = false) {
        var k = Object.keys(this.streams);
        if (!clear) {
            if (!this.selectedStream) {
                this.selectedStream = k[0];
            } else {
                var i = k.indexOf(this.selectedStream);
                var newI = i + direction;
                if (newI >= k.length) {
                    newI = 0;
                } else if (newI < 0) {
                    newI = k.length - 1;
                }
                this.selectedStream = k[newI];
            }
        } else {
            this.selectedStream = '';
        }
        k.forEach(s => {
            if (s !== this.selectedStream) {
                var iw = document.getElementById("iw_" + s);
                iw.style.cssText = iw.style.cssText.replace("border-color: red;", "");
            } else {
                document.getElementById("iw_" + s).style.cssText += "border-color: red;";
            }
        });
    },

    // socketNotificationReceived from helper
    socketNotificationReceived: function(notification, payload) {
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