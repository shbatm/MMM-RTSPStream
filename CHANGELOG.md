# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [4.1.0](https://github.com/shbatm/MMM-RTSPStream/compare/v4.0.0...v4.1.0) (2026-05-08)


### Added

* **demo:** auto-bootstrap WebRTC demo stack and simplify setup ([f3bc1e4](https://github.com/shbatm/MMM-RTSPStream/commit/f3bc1e4497916d05060f4ae569e05d0ee4baa14d))


### Fixed

* **whep:** harden restart lifecycle and startup flow ([8474ddf](https://github.com/shbatm/MMM-RTSPStream/commit/8474ddf59882d0296438c56c1a1346cc0dd99e38))
* **whep:** limit retries and reduce failure log noise ([3816247](https://github.com/shbatm/MMM-RTSPStream/commit/381624733b4caaf08f952d99aeafc61327433ba3))


### Documentation

* update demo script command ([c56f400](https://github.com/shbatm/MMM-RTSPStream/commit/c56f400cc84d6accff6806125d17153789d203ae))


### Chores

* add "type" field to package.json ([b1163ad](https://github.com/shbatm/MMM-RTSPStream/commit/b1163ad44e286f75187602c7821b083cdceae357))
* add automated tests workflow ([bd704ef](https://github.com/shbatm/MMM-RTSPStream/commit/bd704ef64fdb4c9e8a1bab4b1e808c269cf64a70))
* update .prettierignore and refactor config in demo.config.js and eslint.config.mjs ([6c918b3](https://github.com/shbatm/MMM-RTSPStream/commit/6c918b3dbddf563d1ca4ef443cc3daf14d891d70))
* update devDependencies ([1bbd92e](https://github.com/shbatm/MMM-RTSPStream/commit/1bbd92e7cc9856ae862f255922d747f38fa9e319))


### Tests

* add unit tests ([c816b09](https://github.com/shbatm/MMM-RTSPStream/commit/c816b09c45df0071dd5d429b42b534c95c9c125a))

## [4.0.0](https://github.com/shbatm/MMM-RTSPStream/compare/v3.0.1...v4.0.0) (2026-01-16)


### ⚠ BREAKING CHANGES

* replace jsmpeg with webrtc

### Chores

* add missing devDependencies ([8aa096b](https://github.com/shbatm/MMM-RTSPStream/commit/8aa096bf7461d6f6805618edd9534483c3262c1c))
* add release script and commit-and-tag-version dependency ([5ee8968](https://github.com/shbatm/MMM-RTSPStream/commit/5ee8968bb6c32fcd68995a06d14cb49cae75bbcc))
* change workflow runner from ubuntu-latest to ubuntu-slim ([87e592e](https://github.com/shbatm/MMM-RTSPStream/commit/87e592e34aa10f51697f12c042916075804c8bd2))
* update devDependencies ([60f9a51](https://github.com/shbatm/MMM-RTSPStream/commit/60f9a51c24a94e7ebc2d37dcda9c2f1836162ff5))


### Code Refactoring

* replace jsmpeg with webrtc ([44144dd](https://github.com/shbatm/MMM-RTSPStream/commit/44144dda32908b706510075f9c677759ce1e240f))

## [3.0.1](https://github.com/shbatm/MMM-RTSPStream/compare/v3.0.0...v3.0.1) - 2025-09-08

### Added

- docs: add manual installation instructions to README.md

### Changed

- chore: bump actions/stale from 8 to 9
- chore: update devDependencies
- refactor: change git commands in installer script to use 'git switch'

### Fixed

- chore: fix linter and formatter issues
- fix: improve user prompt handling and update test string for `package.json`

### Migration Notes

If you previously used `ffmpeg` for local or remote playback:

1. Remove any `protocol`, `frameRate`, `hwAccel`, and `ffmpegPort` keys from stream configs.
2. Replace `remotePlayer: "ffmpeg"` with `remotePlayer: "webrtc"` (and add `whepUrl` per stream) or `"none"`.
3. Ensure you have a WHEP endpoint (e.g. via a media server like MediaMTX with WHEP enabled).
4. Leave `localPlayer: "vlc"` for hardware accelerated display on the mirror.

Legacy values are ignored with a console warning.

## [3.0.0](https://github.com/shbatm/MMM-RTSPStream/compare/v2.1.0...v3.0.0) - 2025-08-03 - Remove OMXPlayer Support

OMXPlayer is no longer actively developed and has been deprecated. This release removes all OMXPlayer support to simplify the codebase.

### Breaking Changes

**Removed OMXPlayer support**: Use `localPlayer: "vlc"` (hardware acceleration) or `localPlayer: "ffmpeg"` (software) instead.

### Added

- feat(config): add copy-to-clipboard button for configuration output
- feat(config): add clipboard copy and auto-sizing textarea
- feat(script): add RTSP test stream setup script with MediaMTX and FFmpeg automation

### Changed

- chore: remove `vlc.lua` file from repository
- feat!: removed all OMXPlayer-related code and configuration options
  - docs: updated documentation to reflect VLC-only hardware acceleration
  - refactor: simplified installation (no more PM2 setup required)
- refactor: remove `jQuery` dependency from configuration page
- refactor: replace `Bootstrap` with modern CSS Grid/Flexbox layout in configuration page
- refactor: replace `node-rtsp-stream-es6` with `node-ffmpeg-stream`

## [2.1.0](https://github.com/shbatm/MMM-RTSPStream/compare/v2.0.5...v2.1.0) - Refactor Codebase

This release focuses on code modernization and maintainability improvements. The codebase has been significantly refactored with modern JavaScript standards, updated tooling, and comprehensive linting.

**No breaking changes to functionality** - all existing configurations and features should remain compatible, but please report any issues you find.

### Changed

- Code refactoring and modernization for better maintainability
- Updated to ESLint for modern JavaScript linting (replacing JSHint)
- Prettier code formatting applied throughout the codebase
- Replaced `node-fetch` dependency with native Node.js fetch API
- Modernized JavaScript syntax (replaced `var` with `const`/`let`)
- Updated dependencies to latest versions
- Improved code organization and formatting consistency

### Fixed

- Fixed payload check for empty objects in RTSP-PLAY and RTSP-STOP notifications (now properly detects `{}` using `JSON.stringify`)
- Removed unused variables and improved variable scoping
- Fixed DataURI instantiation to avoid scope issues

### Documentation

- Updated Code of Conduct to current version
- Enhanced README with better structure and documentation
- Converted license file to markdown format
- Improved markdown formatting across all documentation files

## [2.0.5](https://github.com/shbatm/MMM-RTSPStream/compare/v2.0.4...v2.0.5) - Revert node-fetch to 2.x

## [2.0.4](https://github.com/shbatm/MMM-RTSPStream/compare/v2.0.3...v2.0.4) - VLC Mute Option

### Changed

- Snyk: Security upgrade ws from 3.3.3 to 5.2.3 by @snyk-bot in https://github.com/shbatm/MMM-RTSPStream/pull/97
- Snyk: Security upgrade node-fetch from 2.6.7 to 3.2.10 by @shbatm in https://github.com/shbatm/MMM-RTSPStream/pull/99
- Add option to mute VLC streams by @shbatm in https://github.com/shbatm/MMM-RTSPStream/pull/100

## [2.0.3](https://github.com/shbatm/MMM-RTSPStream/compare/v2.0.2-dev...v2.0.3) - Maintainance Release

## [2.0.2-dev](https://github.com/shbatm/MMM-RTSPStream/compare/v2.0.1-dev...v2.0.2-dev) - Attempted fix for OMXPlayer with OpenGL (Fake KMS) enabled

### Changed

- Added "--no-osd" command line switch to omxplayer command. Per [this thread](https://www.raspberrypi.org/forums/viewtopic.php?t=159853), "omxplayer uses OpenVG for subtitles and status messsages which is not compatible with the OpenGL (Fake KMS) driver."

## [2.0.1-dev](https://github.com/shbatm/MMM-RTSPStream/compare/v2.0.0...v2.0.1-dev) - Major OMX Bugfixes

### Changed

- App closing now spawns a new process to actually kill the OMX streams, it was getting cut off in the middle of closing everything due to it being an async process.
- Wait for DOM to be shown before calling to start the streams--this was causing the Fullscreen on Resume problems.
- Only start one stream at a time if we're in RotateStreams mode
- Can jump to a specific stream in RotateStreams mode using notifications
- Fixed and cleaned up all notifications and control from other modules
- Fixed broken key bindings after MMM-KeyBindings upgrade
- Fixed issue where module was trying to connect to PM2 while it was already connected (e.g. stop stream 1 and start stream 2 back to back).

## [2.0.0](https://github.com/shbatm/MMM-RTSPStream/compare/v1.2.2...v2.0.0) - Add VLC Streaming Support

### Added

- VLC Window Overlay support added. Use `localPlayer: 'vlc',` in your module configuration.
- Module-wide debug option added for more verbose output: `debug: true,`

### Changed

- `shutdownDelay` parameter moved from the individual stream config sections to the main module config so it only has to be provided once. It has also changed from milliseconds to seconds. Warning has been added if the timeout is less time than it takes to make it through the loop of streams (causes unnecessary restarts).
- `hideFfmpegOutput` configuration option removed from stream config in favor of global `debug` module option.
- Fixed bug where transition timer was not properly reset after module resume.
- Added `hwAccel` stream option for `ffmpeg` to attempt to use hardware accelerated decoding. Encoding still uses CPU unfortunatly.
  - You must update the node-rtsp-stream-es6 package too. This is most easily done by deleting your node_modules folder and re-running `npm install` on the module.
- `RTSP-PLAY` notification now accepts an object `{ stream: "streamX", stopOthers: true }` which will stop other streams before starting the new stream.

## [1.2.2](https://github.com/shbatm/MMM-RTSPStream/compare/v1.2.1...v1.2.2) - Auto-restart OMX Stream every X hours (Partially addresses #29)

### Changed

- Added config option to schedule automatic restarts of the OMX streams.

## [1.2.1](https://github.com/shbatm/MMM-RTSPStream/compare/v1.2.0...v1.2.1) - Custom video window parameters

### Changed

- OMX streams can be started via notification in a custom-sized window.

### Fixed

- Bug fixes for ffmpegPort and absPosition settings.

## [1.2.0](https://github.com/shbatm/MMM-RTSPStream/compare/v1.1.1...v1.2.0) - Use PM2 to control OMX Streams

### Changed

- OMXPlayer streams are started using PM2 to allow auto-restart if the stream closes
- Better shutdown handling if the "Graceful Shutdown" patch is installed.
- Added Absolute Position option to override automatic detection of where to show the video.
- Configuration Builder now included. See instructions in README.md

### Fixed

- Various minor bug fixes and code cleanup
- `port` setting changed to `ffmpegPort` for clarity

## [1.1.1](https://github.com/shbatm/MMM-RTSPStream/compare/v1.1.0...v1.1.1) - Added OMXPlayer Offset config option

- Added `moduleOffset` config option. On some displays, the method used to find the location to draw the video does not properly line up with the screen. Entering a pixel value will shift the video location by that amount.

## [1.1.0](https://github.com/shbatm/MMM-RTSPStream/compare/v1.0.2...v1.1.0) - Hardware Acceleration w/ OMXPlayer

### Changed

- Option to use OMXPlayer on main server's screen to use hardware accelerated video playback. OMXPlayer will draw over top of browser window.
- Option for fullscreen playback with OMXPlayer (double-click or MMM-KeyBindings longpress play)
- Full screen mode can use a different "HD" stream by setting `hdurl` in stream config.
- Updated MMM-KeyBindings calls to match refactored functions from that module
- Implemented independent control for server and remote browser screens

### Fixed

- JSMpeg throws error "Failed to get WebGL context." - Using option in JSMpeg call to disable WebGL.
- Audio is ignored from the streams to prevent interference with other modules.

## [1.0.2](https://github.com/shbatm/MMM-RTSPStream/compare/v1.0.1...v1.0.2) - Fixes #10 - No playback on Monitor resume from suspend

Added actions to suspend/resume the module when a `USER_PRESENCE` notification is received from the MMM-PIR-sensor module. This restarts the camera feeds when the monitor is resumed.

## [1.0.1](https://github.com/shbatm/MMM-RTSPStream/compare/v1.0.0...v1.0.1) - Fixes #2 - Add UDP Protocol

Added option for using UDP protocol in `ffmpeg`

## [1.0.0](https://github.com/shbatm/MMM-RTSPStream/releases/tag/v1.0.0) - Initial Release

First public release
