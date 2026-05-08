const config = {
  address: "0.0.0.0",
  port: 8080,
  basePath: "/",
  ipWhitelist: [],
  language: "eo",
  logLevel: ["INFO", "LOG", "WARN", "ERROR", "DEBUG"],
  modules: [
    {
      module: "clock",
      position: "top_left"
    },
    {
      module: "MMM-RTSPStream",
      position: "middle_center",
      config: {
        autoStart: true,
        rotateStreams: true,
        rotateStreamTimeout: 10,
        moduleWidth: 354,
        moduleHeight: 240,
        localPlayer: "webrtc",
        remotePlayer: "none",
        showSnapWhenPaused: true,
        remoteSnaps: true,
        shutdownDelay: 12,
        stream1: {
          name: "Test Stream",
          url: "rtsp://localhost:8554/test",
          whepUrl: "http://localhost:8889/test/whep",
          width: 640,
          height: 480,
          muted: true
        }
      }
    },
    {
      disabled: true,
      module: "MMM-RTSPStream",
      position: "bottom_left",
      config: {
        autoStart: true,
        rotateStreams: true,
        rotateStreamTimeout: 10,
        moduleWidth: 354,
        moduleHeight: 240,
        localPlayer: "vlc",
        remotePlayer: "none",
        showSnapWhenPaused: true,
        remoteSnaps: true,
        shutdownDelay: 12,
        stream1: {
          name: "",
          url: "http://202.245.13.81/cgi-bin/camera?resolution=640&amp;quality=1&amp;Language=0&amp;COUNTER",
          width: undefined,
          height: undefined,
          muted: true
        }
      }
    }
  ]
};

/** ************* DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") {
  module.exports = config;
}
