/* jshint node: true, esversion: 6*/
Stream = require('node-rtsp-stream-es6');

const options = {
    name: 'Driveway Camera',
    url: 'rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov',
    frameRate: "30",
    port: 9999,
    shutdownDelay: 10000,
    hideFfmpegOutput: true
};

stream = new Stream(options);

stream.startListener();