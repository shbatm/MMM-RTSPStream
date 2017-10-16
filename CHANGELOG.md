
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
