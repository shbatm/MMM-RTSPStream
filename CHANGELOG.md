# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [4.3.0](https://github.com/shbatm/MMM-RTSPStream/compare/v4.2.0...v4.3.0) (2026-08-30)

### Fixed

* cancel delayed Devilspie2 restarts on shutdown ([22f72eb](https://github.com/shbatm/MMM-RTSPStream/commit/22f72eb0f536f160dca7cd3916a052d972b3cb24))
* **env:** respect existing display settings ([d13caae](https://github.com/shbatm/MMM-RTSPStream/commit/d13caaed455aeaf9beae5736f605306faca5d8fc))
* **install:** correct X11 dependency setup ([d607584](https://github.com/shbatm/MMM-RTSPStream/commit/d607584a97cb860522209926d57617a600d4eff1))
* **node_helper:** replace throwing fs callbacks with fs.promises in getVlcPlayer ([3c10365](https://github.com/shbatm/MMM-RTSPStream/commit/3c10365de16dec986f73fc2b1e9d667988472de1))
* **node_helper:** use execFile instead of exec to prevent shell injection in wmctrl calls ([500850b](https://github.com/shbatm/MMM-RTSPStream/commit/500850bde67e785d3d7faab5cfac714a845740d2))

### Chores

* add allowScripts config ([0498ac0](https://github.com/shbatm/MMM-RTSPStream/commit/0498ac0d3db95bb0dd226c0e947165260a8ef2b6))
* optimize indentation ([619c1e8](https://github.com/shbatm/MMM-RTSPStream/commit/619c1e8cbc3340d4745c89fc0ee98b715b30e542))
* update devDependencies ([b821015](https://github.com/shbatm/MMM-RTSPStream/commit/b821015549d1f87bc982016bd720048b4707d711))
* update GitHub Actions ([31c811e](https://github.com/shbatm/MMM-RTSPStream/commit/31c811e82cac456f0be2cf44be9b48239a8b25df))

### Code Refactoring

* centralize VLC payload dispatch ([bc14bf8](https://github.com/shbatm/MMM-RTSPStream/commit/bc14bf8e57965214514f8d4f6a8ea8e3481c0d6d))
* clarify VLC payload names ([956c975](https://github.com/shbatm/MMM-RTSPStream/commit/956c975cd61e69a30d80a3daab962d8b6445bb89))
* clarify WebRTC activation checks ([a9da97c](https://github.com/shbatm/MMM-RTSPStream/commit/a9da97c0c76965c8f10ef66a02c3052467ea702b))
* **css:** nest module selectors ([9314ac3](https://github.com/shbatm/MMM-RTSPStream/commit/9314ac350f5a14bae9742dce93aa50e60ad120a0))
* drop unnecessary callback param from resumed() ([324f47a](https://github.com/shbatm/MMM-RTSPStream/commit/324f47a319262ef412297a0577bd9f5b5bbb3423))
* encapsulate X11 window control ([422ec11](https://github.com/shbatm/MMM-RTSPStream/commit/422ec116407bb43e9a0d18cab9df55e47c2563cb))
* extract WHEP reconnect/status logic to scripts/whep-status.js ([bd3d851](https://github.com/shbatm/MMM-RTSPStream/commit/bd3d851dbf0451543a8f94e5f054c4ea6b5e2848))
* invert negated conditions in selectStream ([c0569e2](https://github.com/shbatm/MMM-RTSPStream/commit/c0569e20295d986f73c3728c8fbcd3a70391ce3f))
* **node_helper:** rename child_process to childProcess for camelcase compliance ([46e9afa](https://github.com/shbatm/MMM-RTSPStream/commit/46e9afa326dd17d64cf0c5a88ffc34122014be5b))
* remove obsolete global and self aliases ([fe52cd7](https://github.com/shbatm/MMM-RTSPStream/commit/fe52cd709354a6478e732aa62c9d0819cad6f52c))
* remove redundant handler-factory functions in getPlayPauseBtn ([59b0db6](https://github.com/shbatm/MMM-RTSPStream/commit/59b0db6448b3217b27f3190be15b8b8bfa02425d))
* remove redundant resume() override, simplify swallowed catch ([f5e0c07](https://github.com/shbatm/MMM-RTSPStream/commit/f5e0c072dbce0053f7aab15c0f0cf5bb7ceb30da))
* remove requiresVersion ([2998776](https://github.com/shbatm/MMM-RTSPStream/commit/29987768a308bf0695ff666fbce92b133747b0f5))
* rename script.js to config-wizard.js ([4b36d14](https://github.com/shbatm/MMM-RTSPStream/commit/4b36d14abed1b2648afa9f118bfa32602d23a932))
* replace ++ with += 1 for no-plusplus compliance ([8112ef5](https://github.com/shbatm/MMM-RTSPStream/commit/8112ef5b77367620c0b38bf44875ecb785b98d6c))
* replace IIFE wrapper with plain block scope ([8b7a4dd](https://github.com/shbatm/MMM-RTSPStream/commit/8b7a4dd3682d2e8e58d6357d5790bc4f220d5c05))
* resolve show() callback via async/await, remove param reassignment ([6c1a383](https://github.com/shbatm/MMM-RTSPStream/commit/6c1a383aa6405c14e138fe875443ccd2b28248b5))
* scope VLC payload declarations ([94b806f](https://github.com/shbatm/MMM-RTSPStream/commit/94b806fff34a133557cc16ac49669a81029c10d4))
* **script.js:** use arrow functions with event.currentTarget instead of this ([b09673e](https://github.com/shbatm/MMM-RTSPStream/commit/b09673ef7c34407084c93672b8c2875ca0ab31ef))
* split notificationReceived into focused handler methods ([7c30d3e](https://github.com/shbatm/MMM-RTSPStream/commit/7c30d3e0ecec582fae9e18ed814a54a34e2ab503))
* use async VLC config file handling ([d8846cb](https://github.com/shbatm/MMM-RTSPStream/commit/d8846cb519d7fe0a2a78ecceebd10ee614ebca23))
* use descriptive local variable names ([8636218](https://github.com/shbatm/MMM-RTSPStream/commit/8636218120879ad1b0dbe174f957aa47edb820ea))
* **window:** extract manager and add tests ([4ed9dc5](https://github.com/shbatm/MMM-RTSPStream/commit/4ed9dc5a9cbaae63e3286d07e96cebd5bdf71a6d))
## [4.2.0](https://github.com/shbatm/MMM-RTSPStream/compare/v4.1.0...v4.2.0) (2026-06-05)


### Added

* **validation:** surface legacy config migration warnings ([2d842e8](https://github.com/shbatm/MMM-RTSPStream/commit/2d842e8ebae36817f623f8b0eee038629fd210c7))


### Fixed

* **builder:** correct stale wording and time unit ([9ce32fb](https://github.com/shbatm/MMM-RTSPStream/commit/9ce32fb4097d515bea3147eaa03458a832b3a94f))
* **builder:** generate v4-compatible stream config ([ae95652](https://github.com/shbatm/MMM-RTSPStream/commit/ae956526fa66fd098179802788b891fa3d338eef))
* **demo:** remove unstable camera source from mediamtx template ([06a7783](https://github.com/shbatm/MMM-RTSPStream/commit/06a7783c8e85fc09b24f6191280c6c623f360ab8))
* **helper:** use rotateStreamTimeout for delay warning ([658be15](https://github.com/shbatm/MMM-RTSPStream/commit/658be15691c966b343ab98762a143ce9df876a9d))
* **ui:** stop forcing wrapper to screen center ([909d1a2](https://github.com/shbatm/MMM-RTSPStream/commit/909d1a2600b7c7d314e9a00ae42357aac355cdc3))


### Documentation

* **script:** update legacy example config to v4 ([2db333e](https://github.com/shbatm/MMM-RTSPStream/commit/2db333e4064600d3472d9ed4467b4d1170495a66))


### Chores

* update devDependencies ([d72ac8e](https://github.com/shbatm/MMM-RTSPStream/commit/d72ac8e6fc0d7d6c1448fd8e310a5458afc33c80))


### Code Refactoring

* **snapshot:** remove datauri and use async built-ins ([87e1ab4](https://github.com/shbatm/MMM-RTSPStream/commit/87e1ab4da1b22033dfc2ac821ed0e7c008a4a9fc))
* **webrtc:** centralize active-mode condition ([d9973b2](https://github.com/shbatm/MMM-RTSPStream/commit/d9973b223e7a0e89ed662e7ddfca1a97314fc36d))
* **webrtc:** switch WHEP start flow to async/await ([e209cd3](https://github.com/shbatm/MMM-RTSPStream/commit/e209cd3434eec08c1c663dac5d70d4b5654f5b6f))

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
