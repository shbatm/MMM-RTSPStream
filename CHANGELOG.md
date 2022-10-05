## :warning: Refer to GitHub Releases page for Change Logs post [2.0.2-dev]

## [2.0.2-dev] - Attempted fix for OMXPlayer with OpenGL (Fake KMS) enabled

Changed:
* Added "--no-osd" command line switch to omxplayer command.  Per [this thread](https://www.raspberrypi.org/forums/viewtopic.php?t=159853), "omxplayer uses OpenVG for subtitles and status messsages which is not compatible with [the OpenGL (Fake KMS)] driver."

## [2.0.1-dev] - Major OMX Bugfixes

Changed:
* App closing now spawns a new process to actually kill the OMX streams, it was getting cut off in the middle of closing everything due to it being an async process.
* Wait for DOM to be shown before calling to start the streams--this was causing the Fullscreen on Resume problems.
* Only start one stream at a time if we're in RotateStreams mode
* Can jump to a specific stream in RotateStreams mode using notifications
* Fixed and cleaned up all notifications and control from other modules
* Fixed broken key bindings after MMM-KeyBindings upgrade
* Fixed issue where module was trying to connect to PM2 while it was already connected (e.g. stop stream 1 and start stream 2 back to back).

## [2.0.0] - Add VLC Streaming Support

Added:

* VLC Window Overlay support added. Use `localPlayer: 'vlc',` in your module configuration.
* Module-wide debug option added for more verbose output: `debug: true,`

Changed:

* `shutdownDelay` parameter moved from the individual stream config sections to the main module config so it only has to be provided once. It has also changed from milliseconds to seconds.  Warning has been added if the timeout is less time than it takes to make it through the loop of streams (causes unnecessary restarts).
* `hideFfmpegOutput` configuration option removed from stream config in favor of global `debug` module option.
* Fixed bug where transition timer was not properly reset after module resume.
* Added `hwAccel` stream option for `ffmpeg` to attempt to use hardware accelerated decoding. Encoding still uses CPU unfortunatly.
    - You must update the node-rtsp-stream-es6 package too. This is most easily done by deleting your node_modules folder and re-running `npm install` on the module.
* `RTSP-PLAY` notification now accepts an object `{ stream: "streamX", stopOthers: true }` which will stop other streams before starting the new stream.

## [1.2.2] - Auto-restart OMX Stream every X hours (Partially addresses #29)

Changes:

* Added config option to schedule automatic restarts of the OMX streams.


## [1.2.1] - Custom video window parameters

Changes:

* OMX streams can be started via notification in a custom-sized window.

Fixes:

* Bug fixes for ffmpegPort and absPosition settings.

## [1.2.0] - Use PM2 to control OMX Streams

Changes:

* OMXPlayer streams are started using PM2 to allow auto-restart if the stream closes
* Better shutdown handling if the "Graceful Shutdown" patch is installed.
* Added Absolute Position option to override automatic detection of where to show the video.
* Configuration Builder now included. See instructions in README.md

Fixes:

* Various minor bug fixes and code cleanup
* `port` setting changed to `ffmpegPort` for clarity

## [1.1.1] - Added OMXPlayer Offset config option

* Added `moduleOffset` config option. On some displays, the method used to find the location to draw the video does not properly line up with the screen.  Entering a pixel value will shift the video location by that amount.

## [1.1.0] - Hardware Acceleration w/ OMXPlayer

Changes:

* Option to use OMXPlayer on main server's screen to use hardware accelerated video playback.  OMXPlayer will draw over top of browser window.
* Option for fullscreen playback with OMXPlayer (double-click or MMM-KeyBindings longpress play)
* Full screen mode can use a different "HD" stream by setting `hdurl` in stream config.
* Updated MMM-KeyBindings calls to match refactored functions from that module
* Implemented independent control for server and remote browser screens

Fixes:

* JSMpeg throws error "Failed to get WebGL context." - Using option in JSMpeg call to disable WebGL.
* Audio is ignored from the streams to prevent interference with other modules.

## [1.0.2] - Fixes #10 - No playback on Monitor resume from suspend

Added actions to suspend/resume the module when a `USER_PRESENCE` notification is received from the MMM-PIR-sensor module. This restarts the camera feeds when the monitor is resumed.

## [1.0.1] - Fixes #2 - Add UDP Protocol

Added option for using UDP protocol in `ffmpeg`

## [1.0.0] - Initial Release

First public release
