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

## [1.0.1] - Fixes #2 - Add UDP Protocol

Added option for using UDP protocol in `ffmpeg`

## [1.0.0] - Initial Release

First public release
