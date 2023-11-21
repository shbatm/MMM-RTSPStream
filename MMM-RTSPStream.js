/* global JSMpeg KeyHandler MM Module */

/* MagicMirror²
 * Module: MMM-RTSPStream
 *
 * By shbatm
 * MIT Licensed.
 */
/* jshint esversion: 6 */
const global = this;

Module.register("MMM-RTSPStream", {
    defaults: {
        initialSetup: false,
        debug: false,
        autoStart: true,
        rotateStreams: false,
        rotateStreamTimeout: 10, // Seconds
        showSnapWhenPaused: true,
        localPlayer: "vlc", // "omxplayer" or "ffmpeg", or "vlc"
        remotePlayer: "none", // "ffmpeg" or "none"
        remoteSnaps: true, // Show remote snapshots
        moduleWidth: 384, // Width = (Stream Width + 30px margin + 2px border) * # of Streams Wide
        moduleHeight: 272, // Height = (Stream Height + 30px margin + 2px border) * # of Streams Tall
        moduleOffset: 0, // Offset to align OMX player windows
        shutdownDelay: 11, // Seconds
        animationSpeed: 1500,
        stream1: {
            name: "BigBuckBunny Test",
            url: "rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov",
            snapshotType: "url", // 'url' or 'file'
            snapshotUrl: "",
            snapshotRefresh: 10, // Seconds
            protocol: "tcp", // 'tcp' or 'udp'
            frameRate: "30",
            ffmpegPort: 9999,
            width: 320,
            height: 240,
            omxRestart: 24, // Hours
            muted: false
        },

        // MMM-KeyBindings Settings
        keyBindings: {
            enabled: true
        }
    },

    keyBindings: {
        enabled: false,
        mode: "DEFAULT",
        map: {
            Play: "MediaPlayPause",
            Previous: "MediaPreviousTrack",
            Next: "MediaNextTrack",
            Select: "Enter"
        },
        multiInstance: true,
        takeFocus: "Menu"
    },

    requiresVersion: "2.4.0", // Required version of MagicMirror

    playing: false,

    currentIndex: -1,

    currentStream: "",

    streams: {},

    // Allow for control on muliple instances
    instance:
        global.location &&
        [
            "localhost",
            "127.0.0.1",
            "::1",
            "::ffff:127.0.0.1",
            undefined,
            "0.0.0.0"
        ].indexOf(global.location.hostname) > -1
            ? "SERVER"
            : "LOCAL",

    start() {
        const self = this;

        // Flag for check if module is loaded
        this.loaded = false;

        if (!this.config.initialSetup) {
            this.sendSocketNotification("CONFIG", this.config);

            Object.keys(this.config)
                .filter((key) => key.startsWith("stream"))
                .forEach((key) => {
                    self.streams[key] = { playing: false };
                });
        }
    },

    setupStreamRotation() {
        this.playing = this.config.autoStart;
        // Reference to function for manual transitions (TODO: FUTURE)
        this.manualTransition = this.rotateStream.bind(this);
        // Call the first stream
        this.manualTransition();
        this.restartTimer();
    },

    rotateStream(goToStream = undefined, goDirection = 0) {
        const k = Object.keys(this.streams);
        let ps = [];
        const resetCurrentIndex = k.length;
        const lastStream = this.currentStream;

        // Update the current index
        if (goToStream && goToStream in this.streams) {
            this.currentStream = goToStream; // Go to a specific slide if in range
        } else {
            if (goDirection === 0) {
                this.currentIndex += 1; // Normal Transition, Increment by 1
            } else {
                this.currentIndex += goDirection; // Told to go a specific direction
            }
            if (this.currentIndex >= resetCurrentIndex) {
                // Wrap-around back to beginning
                this.currentIndex = 0;
            } else if (this.currentIndex < 0) {
                this.currentIndex = resetCurrentIndex - 1; // Went too far backwards, wrap-around to end
            }
            this.currentStream = k[this.currentIndex];
        }

        if (this.playing) {
            if (lastStream) {
                this.stopStream(lastStream);
            }
            ps = this.playStream(this.currentStream);
            if (ps.length > 0) {
                if (this.config.localPlayer === "omxplayer") {
                    this.sendSocketNotification("PLAY_OMXSTREAM", ps);
                } else if (this.config.localPlayer === "vlc") {
                    this.sendSocketNotification("PLAY_VLCSTREAM", ps);
                }
            }
        } else {
            if (lastStream) {
                this.sendSocketNotification("SNAPSHOT_STOP", lastStream);
            }
            this.playSnapshots(this.currentStream);
        }
    },

    restartTimer() {
        if (
            this.config.rotateStreams &&
            Object.keys(this.streams).length > 1 &&
            this.config.rotateStreamTimeout > 0
        ) {
            // Restart the timer
            if (this.transitionTimer) {
                clearInterval(this.transitionTimer);
            }
            this.transitionTimer = setInterval(
                this.manualTransition,
                this.config.rotateStreamTimeout * 1000
            );
        }
    },

    /* suspend()
     * This method is called when a module is hidden.
     */
    suspend() {
        console.log(`${this.name} is suspended...`);
        this.suspended = true;
        this.stopAllStreams(false);
        if (this.selectedStream) {
            this.selectStream(undefined, true);
        }
    },

    /* resume()
     * This method is called when a module is shown.
     */
    resume() {},

    resumed(callback) {
        console.log(
            `${this.name} has resumed... rotateStreams: ${this.config.rotateStreams}, autoStart: ${this.config.autoStart}`
        );
        this.suspended = false;
        if (this.loaded) {
            if (this.config.rotateStreams) {
                this.setupStreamRotation();
            } else if (this.config.autoStart) {
                this.playAll();
            } else {
                console.log("Playing all snapshots");
                Object.keys(this.streams).forEach((s) => this.playSnapshots(s));
            }
        }
        if (typeof callback === "function") {
            callback();
        }
    },

    // Overwrite the module show method to force a callback.
    show(speed, callback, options) {
        if (typeof callback === "object") {
            options = callback;
            callback = function () {};
        }

        const newCallback = () => {
            this.resumed(callback);
        };
        options = options || {};

        MM.showModule(this, speed, newCallback, options);
    },

    playBtnCallback(s) {
        let ps = [];
        if (this.config.rotateStreams) {
            if (this.playing) {
                this.stopStream(this.currentStream);
                this.playSnapshots(this.currentStream);
            } else {
                this.sendSocketNotification(
                    "SNAPSHOT_STOP",
                    this.currentStream
                );
                ps = this.playStream(this.currentStream);
                if (ps.length > 0) {
                    if (this.config.localPlayer === "omxplayer") {
                        this.sendSocketNotification("PLAY_OMXSTREAM", ps);
                    } else if (this.config.localPlayer === "vlc") {
                        this.sendSocketNotification("PLAY_VLCSTREAM", ps);
                    }
                }
            }
        } else if (this.streams[s].playing) {
            this.stopStream(s);
            this.playSnapshots(s);
        } else {
            this.sendSocketNotification("SNAPSHOT_STOP", s);
            ps = this.playStream(s);
            if (ps.length > 0) {
                if (this.config.localPlayer === "omxplayer") {
                    this.sendSocketNotification("PLAY_OMXSTREAM", ps);
                } else if (this.config.localPlayer === "vlc") {
                    this.sendSocketNotification("PLAY_VLCSTREAM", ps);
                }
            }
        }
    },

    playBtnDblClickCB(s) {
        if (this.instance === "SERVER" && !this.streams[s].playing) {
            const ps = this.playStream(s, true);
            if (ps.length > 0) {
                if (this.config.localPlayer === "omxplayer") {
                    this.sendSocketNotification("PLAY_OMXSTREAM", ps);
                } else if (this.config.localPlayer === "vlc") {
                    this.sendSocketNotification("PLAY_VLCSTREAM", ps);
                }
            }
        } else {
            this.playBtnCallback(s);
        }
    },

    getDom() {
        // create element wrapper for show into the module
        const wrapper = document.createElement("div");

        if (this.config.initialSetup) {
            wrapper.innerHTML = `Use config wizard at http://${global.location.hostname}:${global.location.port}/${this.name}/config.html<br>to generate a configuration for this moudle.`;
            return wrapper;
        }
        if (!this.loaded) {
            wrapper.innerHTML = `Loading ${this.name}...`;
            wrapper.className = "dimmed light small";
            return wrapper;
        }
        if (this.error) {
            wrapper.innerHTML = "Error loading data...";
            return wrapper;
        }

        if (this.loaded) {
            wrapper.style.cssText = `width: ${this.config.moduleWidth}px; height:${this.config.moduleHeight}px`;
            wrapper.className = "MMM-RTSPStream wrapper";

            if (this.config.rotateStreams) {
                const iw = this.getInnerWrapper("");
                iw.appendChild(this.getCanvas(""));
                iw.appendChild(this.getPlayPauseBtn(""));
                wrapper.appendChild(iw);
            } else {
                Object.keys(this.streams).forEach((stream) => {
                    const iw = this.getInnerWrapper(stream);
                    iw.appendChild(this.getCanvas(stream));
                    iw.appendChild(this.getPlayPauseBtn(stream));
                    wrapper.appendChild(iw);
                });
            }
            wrapper.appendChild(document.createElement("br"));
        }
        return wrapper;
    },

    getCanvasSize(streamConfig) {
        let s = "";
        if (typeof streamConfig.width !== "undefined") {
            s += `width: ${streamConfig.width}px; `;
        }
        if (typeof streamConfig.height !== "undefined") {
            s += `height: ${streamConfig.height}px; line-height: ${streamConfig.height};`;
        }
        return s;
    },

    getCanvas(stream) {
        const canvas = document.createElement("canvas");
        canvas.id = `canvas_${stream}`;
        canvas.className = "MMM-RTSPStream canvas";
        // if (stream) { canvas.cssText = this.getCanvasSize(this.config[stream]); }
        return canvas;
    },

    getInnerWrapper(stream) {
        const innerWrapper = document.createElement("div");
        innerWrapper.className = "MMM-RTSPStream innerWrapper";
        if (!stream) {
            stream = "stream1";
        }
        innerWrapper.style.cssText = this.getCanvasSize(this.config[stream]);
        innerWrapper.id = `iw_${stream}`;
        return innerWrapper;
    },

    getPlayPauseBtn(stream) {
        const self = this;

        function makeOnClickHandler(s) {
            return function () {
                self.playBtnCallback(s);
            };
        }

        function makeOnDblClickHandler(s) {
            return function () {
                self.playBtnDblClickCB(s);
            };
        }

        const playBtnWrapper = document.createElement("div");
        playBtnWrapper.className = "control";
        playBtnWrapper.onclick = makeOnClickHandler(stream);
        playBtnWrapper.oncontextmenu = makeOnDblClickHandler(stream);
        playBtnWrapper.id = `playBtnWrapper_${stream}`;

        const playBtnLabel = document.createElement("label");
        playBtnLabel.id = `playBtnLabel_${stream}`;
        playBtnLabel.innerHTML = '<i class="fa fa-play-circle"></i>';
        playBtnWrapper.appendChild(playBtnLabel);
        return playBtnWrapper;
    },

    updatePlayPauseBtn(stream, forceVisible = false) {
        const buttonId = this.config.rotateStreams
            ? "playBtnLabel_"
            : `playBtnLabel_${stream}`;
        const button = document.getElementById(buttonId);
        if (!button) {
            // If not ready yet, retry in 1 second.
            setTimeout(
                () => this.updatePlayPauseBtn(stream, forceVisible),
                1000
            );
            return;
        }
        if (stream !== "" && this.streams[stream].playing) {
            button.innerHTML = '<i class="fa fa-pause-circle"></i>';
        } else {
            button.innerHTML = '<i class="fa fa-play-circle"></i>';
        }

        if (forceVisible) {
            button.style.cssText = "opacity: 0.6;";
            button.parentElement.style.cssText = "opacity: 1;";
        } else {
            button.style.cssText = "";
            button.parentElement.style.cssText = "";
        }
    },

    playStream(stream, fullscreen = false, absPosition = undefined) {
        const canvasId = this.config.rotateStreams
            ? "canvas_"
            : `canvas_${stream}`;
        const canvas = document.getElementById(canvasId);
        const omxPayload = [];

        if (this.streams[stream].playing) {
            this.stopStream(stream);
        }

        if (
            this.instance === "SERVER" &&
            ["omxplayer", "vlc"].indexOf(this.config.localPlayer) !== -1
        ) {
            const rect = canvas.getBoundingClientRect();
            const offset = {};
            const payload = { name: stream };
            if (typeof this.config.moduleOffset === "object") {
                offset.left =
                    "left" in this.config.moduleOffset
                        ? this.config.moduleOffset.left
                        : 0;
                offset.top =
                    "top" in this.config.moduleOffset
                        ? this.config.moduleOffset.top
                        : 0;
            } else {
                offset.left = this.config.moduleOffset;
                offset.top = this.config.moduleOffset;
            }
            let box = {};
            if ("absPosition" in this.config[stream]) {
                box = this.config[stream].absPosition;
            } else if (typeof absPosition !== "undefined") {
                box = absPosition;
            } else if (fullscreen) {
                payload.fullscreen = true;
            } else {
                box = {
                    top: Math.round(rect.top + offset.top), // Compensate for Margins
                    right: Math.round(rect.right + offset.left), // Compensate for Margins
                    bottom: Math.round(rect.bottom + offset.top), // Compensate for Margins
                    left: Math.round(rect.left + offset.left) // Compensate for Margins
                };
            }
            payload.box = box;
            omxPayload.push(payload);
        } else {
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const sUrl = `ws://${document.location.hostname}:${this.config[stream].ffmpegPort}`;
            const player = new JSMpeg.Player(sUrl, {
                canvas,
                disableGl: true,
                audio: false
            });
            this.streams[stream].player = player;
        }

        this.streams[stream].playing = true;
        this.playing = true;
        this.updatePlayPauseBtn(stream);
        return omxPayload;
    },

    playSnapshots(stream) {
        // Show the snapshot instead of the stream
        const snapUrl = this.config[stream].snapshotUrl;
        const canvasId = this.config.rotateStreams
            ? "canvas_"
            : `canvas_${stream}`;
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext("2d");
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

    playAll() {
        let ps = [];
        Object.keys(this.streams).forEach((s) => {
            if (
                this.instance === "SERVER" ||
                (this.instance === "LOCAL" &&
                    this.config.remotePlayer === "ffmpeg")
            ) {
                const res = this.playStream(s);
                if (res.length > 0) {
                    ps = ps.concat(res);
                }
                if (!(this.instance === "SERVER" && this.config.remoteSnaps)) {
                    this.sendSocketNotification("SNAPSHOT_STOP", s);
                }
            }
        });
        if (ps.length > 0) {
            if (this.config.localPlayer === "omxplayer") {
                this.sendSocketNotification("PLAY_OMXSTREAM", ps);
            } else if (this.config.localPlayer === "vlc") {
                this.sendSocketNotification("PLAY_VLCSTREAM", ps);
            }
        }
    },

    stopStream(stream, omxStopAll = false) {
        if (this.streams[stream].playing) {
            if (
                this.instance === "SERVER" &&
                this.config.localPlayer === "omxplayer" &&
                !omxStopAll
            ) {
                this.sendSocketNotification("STOP_OMXSTREAM", stream);
            } else if (
                this.instance === "SERVER" &&
                this.config.localPlayer === "vlc" &&
                !omxStopAll
            ) {
                this.sendSocketNotification("STOP_VLCSTREAM", {
                    name: stream,
                    delay: this.config.shutdownDelay
                });
            } else if ("player" in this.streams[stream]) {
                this.streams[stream].player.destroy();
                delete this.streams[stream].player;
            }
            this.streams[stream].playing = false;
        }

        if (
            Object.keys(this.streams).filter((s) => {
                return s.playing;
            }).length === 0
        ) {
            this.playing = false;
        }
    },

    stopAllStreams(startSnapshots = true) {
        let omxStopAll = false;
        if (
            this.instance === "SERVER" &&
            this.config.localPlayer === "omxplayer"
        ) {
            this.sendSocketNotification("STOP_ALL_OMXSTREAMS", "");
            omxStopAll = true;
        }
        if (this.instance === "SERVER" && this.config.localPlayer === "vlc") {
            this.sendSocketNotification(
                "STOP_ALL_VLCSTREAMS",
                this.config.shutdownDelay
            );
            omxStopAll = true;
        }
        Object.keys(this.streams).forEach((s) => {
            this.stopStream(s, omxStopAll);
            if (startSnapshots) {
                if (!this.config.rotateStreams) {
                    this.playSnapshots(s);
                }
            } else {
                this.sendSocketNotification("SNAPSHOT_STOP", s);
            }
            this.updatePlayPauseBtn(s);
        });
        if (startSnapshots && this.config.rotateStreams) {
            this.manualTransition();
            this.restartTimer();
        }
    },

    toggleStreams(payload) {
        let ps = [];
        if (this.config.rotateStreams) {
            if (this.playing) {
                this.stopStream(this.currentStream);
                this.playSnapshots(this.currentStream);
            } else {
                if (
                    (this.instance === "SERVER" && !this.config.remoteSnaps) ||
                    (this.instance === "LOCAL" &&
                        this.config.remotePlayer === "ffmpeg")
                ) {
                    this.sendSocketNotification(
                        "SNAPSHOT_STOP",
                        this.currentStream
                    );
                }
                if (
                    this.instance === "SERVER" ||
                    (this.instance === "LOCAL" &&
                        this.config.remotePlayer === "ffmpeg")
                ) {
                    ps = this.playStream(this.currentStream);
                }
            }
        } else if (!this.selectedStream) {
            if (this.playing) {
                this.stopAllStreams();
            } else {
                this.playAll();
            }
        } else if (this.streams[this.selectedStream].playing) {
            this.stopStream(this.selectedStream);
            this.playSnapshots(this.selectedStream);
        } else {
            if (
                (this.instance === "SERVER" && !this.config.remoteSnaps) ||
                (this.instance === "LOCAL" &&
                    this.config.remotePlayer === "ffmpeg")
            ) {
                this.sendSocketNotification(
                    "SNAPSHOT_STOP",
                    this.selectedStream
                );
            }
            if (
                this.instance === "SERVER" &&
                payload.KeyState === "KEY_LONGPRESSED"
            ) {
                ps = this.playStream(this.selectedStream, true);
            } else if (
                this.instance === "SERVER" ||
                (this.instance === "LOCAL" &&
                    this.config.remotePlayer === "ffmpeg")
            ) {
                ps = this.playStream(this.selectedStream);
            }
        }
        if (ps.length > 0) {
            if (this.config.localPlayer === "omxplayer") {
                this.sendSocketNotification("PLAY_OMXSTREAM", ps);
            } else if (this.config.localPlayer === "vlc") {
                this.sendSocketNotification("PLAY_VLCSTREAM", ps);
            }
        }
    },

    getScripts() {
        return [this.file("scripts/jsmpeg.min.js")];
    },

    getStyles() {
        return [`${this.name}.css`, "font-awesome.css"];
    },

    notificationReceived(notification, payload, sender) {
        let ps = [];

        if (notification === "DOM_OBJECTS_CREATED") {
            // Register Key Handler
            if (
                this.config.keyBindings.enabled &&
                MM.getModules().filter((kb) => kb.name === "MMM-KeyBindings")
                    .length > 0
            ) {
                this.keyBindings = {
                    ...this.keyBindings,
                    ...this.config.keyBindings
                };
                KeyHandler.register(this.name, {
                    sendNotification: (n, p) => {
                        this.sendNotification(n, p);
                    },
                    validKeyPress: (kp) => {
                        this.validKeyPress(kp);
                    }
                });
                this.keyHandler = KeyHandler.create(
                    this.name,
                    this.keyBindings
                );
            }

            const api = {
                module: this.name,
                path: "stream",
                actions: {
                    play: {
                        notification: "RTSP-PLAY",
                        prettyName: "Play Stream(s)"
                    },
                    stop: {
                        notification: "RTSP-STOP",
                        prettyName: "Stop Stream(s)"
                    },
                    fullscreen: {
                        notification: "RTSP-PLAY-FULLSCREEN",
                        prettyName: "Play Fullscreen"
                    },
                    window: {
                        notification: "RSTP-PLAY-WINDOW",
                        prettyName: "Play in Window"
                    }
                }
            };
            this.sendNotification("REGISTER_API", api);
        }
        if (
            this.keyHandler &&
            this.keyHandler.validate(notification, payload)
        ) {
            return;
        }

        // Handle USER_PRESENCE events from the MMM-PIR-sensor Module
        if (notification === "USER_PRESENCE") {
            if (payload) {
                if (this.suspended && this.suspendedForUserPresence) {
                    this.resumed();
                }
                this.suspendedForUserPresence = false;
            } else {
                this.suspend();
                this.suspendedForUserPresence = true;
            }
        }
        if (notification === "RTSP-PLAY" && this.instance === "SERVER") {
            if (!payload || payload === {} || payload === "all") {
                if (this.config.rotateStreams) {
                    this.playing = true;
                    this.manualTransition(undefined, 1);
                    this.restartTimer();
                } else {
                    this.playAll();
                }
            } else if (this.config.rotateStreams) {
                this.playing = true;
                this.manualTransition(payload);
                this.restartTimer();
            } else {
                ps = this.playStream(payload);
            }
        }
        if (
            notification === "RTSP-PLAY-FULLSCREEN" &&
            this.instance === "SERVER"
        ) {
            ps = this.playStream(payload, true);
        }
        if (notification === "RSTP-PLAY-WINDOW" && this.instance === "SERVER") {
            ps = this.playStream(payload.name, false, payload.box);
        }
        if (notification === "RTSP-STOP" && this.instance === "SERVER") {
            if (!payload || payload === {} || payload === "all") {
                this.stopAllStreams();
            } else {
                this.stopStream(payload);
            }
        }

        if (ps.length > 0) {
            if (this.config.localPlayer === "omxplayer") {
                this.sendSocketNotification("PLAY_OMXSTREAM", ps);
            } else if (this.config.localPlayer === "vlc") {
                this.sendSocketNotification("PLAY_VLCSTREAM", ps);
            }
        }
    },

    validKeyPress(kp) {
        // Example for responding to "Left" and "Right" arrow
        console.log(kp);
        if (kp.keyName === this.keyHandler.config.map.Play) {
            this.toggleStreams(kp);
        }
        if (kp.keyName === this.keyHandler.config.map.Next) {
            if (this.config.rotateStreams) {
                this.manualTransition(undefined, 1);
                this.restartTimer();
            } else {
                this.selectStream(1);
            }
        } else if (kp.keyName === this.keyHandler.config.map.Previous) {
            if (this.config.rotateStreams) {
                this.manualTransition(undefined, -1);
                this.restartTimer();
            } else {
                this.selectStream(-1);
            }
        }
    },

    selectedStream: "",

    selectStream(direction = 1, clear = false) {
        const k = Object.keys(this.streams);
        if (!clear) {
            if (!this.selectedStream) {
                this.selectedStream = k[0];
            } else {
                const i = k.indexOf(this.selectedStream);
                let newI = i + direction;
                if (newI >= k.length) {
                    newI = 0;
                } else if (newI < 0) {
                    newI = k.length - 1;
                }
                this.selectedStream = k[newI];
            }
        } else {
            this.selectedStream = "";
        }
        k.forEach((s) => {
            if (s !== this.selectedStream) {
                const iw = document.getElementById(`iw_${s}`);
                iw.style.cssText = iw.style.cssText.replace(
                    "border-color: red;",
                    ""
                );
            } else {
                document.getElementById(`iw_${s}`).style.cssText +=
                    "border-color: red;";
            }
        });
    },

    // socketNotificationReceived from helper
    socketNotificationReceived(notification, payload) {
        if (notification === "STARTED") {
            if (!this.loaded) {
                this.loaded = true;
                this.updateDom(this.config.animationSpeed);
                if (!this.suspended) {
                    setTimeout(
                        () => this.resumed(),
                        this.config.animationSpeed + 500
                    );
                }
            }
        }
        if (notification === "SNAPSHOT") {
            if (payload.image) {
                let img = document.getElementById(`img_${payload.name}`);
                if (img === null) {
                    const iw = document.getElementById(`iw_${payload.name}`);
                    img = document.createElement("img");
                    img.style.width = "100%";
                    img.style.height = "100%";
                    img.id = `img_${payload.name}`;
                    console.log(iw, img);
                    img.className = "MMM-RTSPStream snapshot";
                    iw.appendChild(img);
                }
                img.src = payload.buffer;
            }
        }
    }
});
