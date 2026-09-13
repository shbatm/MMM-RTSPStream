# MMM-RTSPStream - Video Streaming from Live Feeds (Security Cameras)

This is a module for [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror/).

This module will show a live RTSP video stream and/or periodic snapshots on the MagicMirror² from any IP Security Camera which supports the [RTSP protocol](https://github.com/shbatm/MMM-RTSPStream/wiki/Stream-URLs-for-Various-Cameras) and/or can serve a snapshot periodically.

> :warning: **Project Status**: This module is maintained on a best-effort basis with occasional updates for technical interest. No dedicated support is provided. The module works as-is, but users should be prepared to troubleshoot issues independently. :warning:
>
> **Background:**
>
> - I am no longer using this module on my own mirror. After several years, I found that I use the snapshots much more frequently than I streamed the actual cameras, which can be performed by much simpler modules and methods. To enable streaming, WebRTC (like [MMM-HomeAssistant-WebRTC](https://github.com/Anonym-tsk/MMM-HomeAssistant-WebRTC)) is a newer and better standard with much lower server overhead and latency for delivering RTSP Streams to the frontend than any of the options used here, in the future, this will be the method I focus on and I will not try to shoehorn another technology into this module.

## Maintainer

- [shbatm](https://github.com/shbatm) - does not actively maintain this module anymore
- [KristjanESPERANTO](https://github.com/KristjanESPERANTO) - neither actively maintains this module, but accepts community contributions

## Features

- Supports single or multiple camera streams/snapshots
- For multiple streams: supports rotating through streams in a single window or displaying multiple windows (with customizeable layout)
- Supports fetching snapshots from a file or url when not actively streaming
- Flexible configurations to limit resource use on Raspberry Pi --
  - Stops all streams when module is hidden
  - Option for AutoPlay or manual starting of stream
  - Plays one or all streams (when displaying multiple)
  - _Note:_ 3 simultaneous streams on a RaspberryPi 3 is about the limit for usability.
- Support for [MMM-KeyBindings](https://github.com/shbatm/MMM-KeyBindings) module for Play/Pause Remote Control and navigation of multiple streams
- Hardware-Accelerated Playback on the main screen, with option to use software playback on a remote browser window.
- When using `vlc`, double-clicking the play button (or longpressing PlayPause key if using MMM-KeyBindings) will play the video fullscreen. Click anywhere once (or Pause with MMM-KeyBindings) to exit.

## Dependencies

### System Packages

The following packages are required for local VLC playback. The preinstall script attempts to install the X11 helper packages on Debian-based systems when an X11 session is detected. Install the media player separately:

- `vlc` - Hardware-accelerated video playback (local screen)
- `devilspie2` - Window positioning, sizing, and decoration removal for VLC
- `wmctrl` - Window visibility and focus management for VLC

### Optional (for WebRTC remote playback)

- A media server exposing a WHEP (WebRTC-HTTP Egress Protocol) endpoint (e.g. [MediaMTX](https://github.com/bluenviron/mediamtx))

### Architecture (v4+)

| Path            | Use Case               | Flow                                                                                  | Notes                                                                |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Local (VLC)     | Main mirror display    | RTSP Camera → VLC (external) → Hardware overlay (window managed by devilspie2/wmctrl) | Lowest CPU usage; supports fullscreen via double-click/long-press    |
| Remote (WebRTC) | Remote browser viewing | RTSP Camera → Media Server (WHEP) → Browser `<video>` via native WebRTC               | Low latency, no transcoding in module. Provide `whepUrl` per stream. |

## Screenshot

![Screenshot with 3 streams](screenshot.png)

## Installation

### Manual install

Just like any other MagicMirror² module, you can install this module by navigating to your MagicMirror's `modules` directory and cloning this repository:

```bash
cd ~/MagicMirror/modules
git clone https://github.com/shbatm/MMM-RTSPStream
cd MMM-RTSPStream
npm install
```

### Quick install

If you followed the default installation instructions for the [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror) project, you should be able to use the automatic installer.
The following command will download the installer and execute it:

```bash
bash -c "$(curl -s https://raw.githubusercontent.com/shbatm/MMM-RTSPStream/master/scripts/installer.sh)"
```

## Updating after a Module Update

Re-run the installation script above, or do the following:

```shell
cd ~/MagicMirror/modules/MMM-RTSPStream
git pull
npm install
```

## Configuration

### Configuration builder

**To use this module, use the configuration builder tool included.**

1. Install the module (see above).
2. Add the following to your config:

   ```js
   {
      module: "MMM-RTSPStream",
      position: "middle_center",
      config: {
         initialSetup: true,
      },
   },
   ```

3. Restart the MagicMirror
4. Open a web-browser and navigate to: <http://your-mirror-ip:8080/MMM-RTSPStream/config.html>
5. Use the tool to generate your config details.
6. Copy the section to your MagicMirror `config.js` file.
7. Restart the MagicMirror

### Example

```js
{
   module: "MMM-RTSPStream",
   position: "middle_center",
   config: {
      localPlayer: "vlc",
      stream1: {
         name: "My Camera",
         url: "rtsp://example.com/camera/stream",
         snapshotUrl: "http://example.com/camera/snapshot.jpg",
         width: 640,
         height: 480,
      },
   },
},
```

### Configuration options

| Option                   | Default             | Notes                                                                                                                                            |
| ------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `initialSetup`           | `false`             | Show the configuration builder instead of starting the module.                                                                                   |
| `autoStart`              | `true`              | Start the stream(s) automatically.                                                                                                               |
| `rotateStreams`          | `false`             | Rotate through all streams in a single window when `true`; display an individual window for each stream when `false`.                            |
| `rotateStreamTimeout`    | `10`                | Seconds to show each stream when `rotateStreams` is `true`.                                                                                      |
| `localPlayer`            | `"vlc"`             | Local playback method: `vlc` or `mplayer` (external window), or `webrtc` (inline video element).                                                 |
| `remotePlayer`           | `"none"`            | Remote browser playback: `webrtc` or `none`. Only needed for additional devices.                                                                 |
| `remoteSnaps`            | `true`              | Continue showing snapshots in remote browser windows while playing locally. Set to `false` to save resources when only the local screen is used. |
| `showSnapWhenPaused`     | `true`              | Show snapshots when the stream(s) is paused.                                                                                                     |
| `moduleWidth`            | `384`               | Module width in pixels. Adjust this to control how many streams fit side by side.                                                                |
| `moduleHeight`           | `272`               | Module height in pixels.                                                                                                                         |
| `moduleOffset`           | `0`                 | VLC/MPlayer pixel offset. Use a number for both axes or an object such as `{ left: 10, top: -10 }`.                                              |
| `shutdownDelay`          | `11`                | Seconds to wait before stopping the last stream. Set to `0` to stop immediately.                                                                 |
| `animationSpeed`         | `1500`              | DOM update animation speed in milliseconds.                                                                                                      |
| `debug`                  | `false`             | Enable additional logging.                                                                                                                       |
| `keyBindings`            | `{ enabled: true }` | Optional MMM-KeyBindings configuration. See the dedicated section below.                                                                         |
| `whepAutoRefresh`        | `false`             | Automatically restart a WHEP feed when it appears hung or stalled.                                                                               |
| `whepCheckInterval`      | `10000`             | Health-check interval in milliseconds when `whepAutoRefresh` is enabled.                                                                         |
| `whepHangTimeout`        | `60000`             | Time without media progress before a feed is considered hung.                                                                                    |
| `whepRestartMaxAttempts` | `5`                 | Maximum automatic reconnect attempts. `0` means unlimited.                                                                                       |
| `whepRestartBaseDelay`   | `2000`              | Base reconnect backoff delay in milliseconds.                                                                                                    |
| `whepRestartMaxDelay`    | `30000`             | Maximum reconnect backoff delay in milliseconds.                                                                                                 |
| `showWhepStatusOverlay`  | `true`              | Show a status message while a WHEP feed is reconnecting or has failed.                                                                           |
| `streamX`                | -                   | Individual stream configuration. See the table below.                                                                                            |

### Stream configuration options

Add one `streamX` section for each stream, where `X` is a number such as `stream1`, `stream2`, or `stream3`.

```js
config: {
    // ... <other config options; see above> ...,
    stream1: {
        name: 'BigBuckBunny Test Stream',
        url: 'rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov',
        // ... <additional stream options; see below> ...
    },
    stream2: {
        // ...
    },
    // ...
}
```

| Option            | Default  | Notes                                                                                                                                                                    |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`            | -        | Required stream name. It is shown when snapshots are disabled.                                                                                                           |
| `url`             | test URL | RTSP stream URL. See the [stream URL wiki](https://github.com/shbatm/MMM-RTSPStream/wiki/Stream-URLs-for-Various-Cameras). Include credentials in the URL when required. |
| `whepUrl`         | `""`     | WHEP endpoint URL required for WebRTC playback.                                                                                                                          |
| `snapshotUrl`     | `""`     | Camera snapshot URL or file path. Leave blank to show only the stream name when paused.                                                                                  |
| `snapshotType`    | `"url"`  | Snapshot source type: `url` or `file`.                                                                                                                                   |
| `snapshotRefresh` | `10`     | Snapshot refresh interval in seconds.                                                                                                                                    |
| `width`           | `320`    | Stream width in pixels.                                                                                                                                                  |
| `height`          | `240`    | Stream height in pixels.                                                                                                                                                 |
| `absPosition`     | -        | VLC/MPlayer absolute position. Overrides automatic window positioning and `moduleOffset`; use `{ top, right, bottom, left }`.                                            |
| `muted`           | `false`  | Mute audio for VLC, MPlayer, or WebRTC playback.                                                                                                                         |

#### Testing a camera feed

To test to make sure you have a working url for a camera feed: create a text file with the URL as the first and only line in the file. Save the file as `<somename>.strm` and open the file with a video player like [VLC](https://www.videolan.org/vlc/#download).

### WebRTC Setup (MediaMTX)

WebRTC playback (`localPlayer: "webrtc"` or `remotePlayer: "webrtc"`) requires a media server that converts RTSP to WHEP (WebRTC-HTTP Egress Protocol). [MediaMTX](https://github.com/bluenviron/mediamtx) is recommended.

**Why use WebRTC instead of VLC?**

- Works on Wayland without window positioning issues
- Lower latency (~500ms vs 2-3s)
- No external windows (renders in browser canvas)
- Always stays on top (embedded in MagicMirror)

**Quick Setup:**

1. Prepare MediaMTX (downloads binary, validates local RTSP/WHEP stack):

   ```bash
   cd ~/MagicMirror/modules/MMM-RTSPStream
   RTSPSTREAM_SKIP_MM=1 node --run demo
   ```

   On Raspberry Pi (or other non-default architectures), set `MEDIAMTX_ARCH` explicitly, for example:

   ```bash
   MEDIAMTX_ARCH=linux_arm64v8 RTSPSTREAM_SKIP_MM=1 node --run demo
   ```

2. Configure your stream in `mediamtx/mediamtx.yml`:

   ```yaml
   paths:
     mycamera:
       source: rtsp://username:password@192.168.1.100:554/stream1
   ```

3. Use the WHEP URL in your MagicMirror config:

   ```js
   stream1: {
       name: 'My Camera',
       url: 'rtsp://192.168.1.100:554/stream1',
       whepUrl: 'http://localhost:8889/mycamera/whep',
       width: 640,
       height: 480
   }
   ```

MediaMTX will convert your RTSP stream to WebRTC and make it available at `http://localhost:8889/mycamera/whep`.

**Autostart Configuration (systemd):**

To automatically start MediaMTX on system boot:

1. Create a systemd service file:

   ```bash
   sudo nano /etc/systemd/system/mediamtx.service
   ```

2. Add the following content (adjust paths if needed):

   ```ini
   [Unit]
   Description=MediaMTX RTSP to WebRTC Server
   After=network.target

   [Service]
   Type=simple
   User=pi
   WorkingDirectory=/home/pi/MagicMirror/modules/MMM-RTSPStream/mediamtx
   ExecStart=/home/pi/MagicMirror/modules/MMM-RTSPStream/mediamtx/mediamtx /home/pi/MagicMirror/modules/MMM-RTSPStream/mediamtx/mediamtx.yml
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```

   **Note:** Replace `pi` with your username and adjust paths to match your installation directory.

3. Enable and start the service:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable mediamtx
   sudo systemctl start mediamtx
   ```

4. Check status:

   ```bash
   sudo systemctl status mediamtx
   ```

MediaMTX will now start automatically on every reboot before MagicMirror.

**Common Configurations:**

```js
// Single device (mirror only) - most common
localPlayer: "webrtc",
remotePlayer: "none"

// Mirror uses VLC, allow smartphone/tablet access via WebRTC
localPlayer: "vlc",
remotePlayer: "webrtc"

// Both mirror and remote devices use WebRTC
localPlayer: "webrtc",
remotePlayer: "webrtc"  // Both share the same whepUrl
```

**Troubleshooting:**

- Check MediaMTX is running: `curl http://localhost:9997/v3/config/global/get`
- Check stream status: `curl http://localhost:9997/v3/paths/list`
- View MediaMTX logs: `sudo journalctl -u mediamtx -f` (if running as systemd service) or check terminal output

### Controlling from other modules

The streams can be controlled on the main screen by sending a module notification. Examples:

```js
this.sendNotification("RTSP-PLAY", "all"); // Play all streams (or current stream if rotating)
this.sendNotification("RTSP-PLAY", "streamX"); // Play a particular stream (when not rotating)
this.sendNotification("RTSP-PLAY-FULLSCREEN", "streamX"); // Play a particular stream fullscreen (when using VLC)
this.sendNotification("RTSP-PLAY-WINDOW", {
  name: "streamX",
  box: { top: XX, right: XX, bottom: XX, left: XX }
}); // Play a particular stream in a custom window (when using VLC)
this.sendNotification("RTSP-STOP", "all"); // Stop the streams
this.sendNotification("RTSP-STOP", "streamX"); // Stop a particular stream
```

### KeyBindings Configuration (Requires [MMM-KeyBindings](https://github.com/shbatm/MMM-KeyBindings))

_To change from the defaults, add changes to the end of the module's configuration section_

| Option | Description                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mode` | _Default:_ `"DEFAULT"` - Will respond to a key press if no other module has the focus.<br>_Note:_ - To enable this module to take focus, change this value and add a `Focus` key name below.                                                                                                                                                                                                                               |
| `map`  | The map between this module's key functions and the Keyboard / MMM-KeyBinding's key name that is sent (i.e. when the "MediaPlayPause" key is pressed, it will send a `Play` action to this module).<br>`Previous`/`Next` actions will cycle through the streams when `rotateStreams` is enabled, and will change which stream is selected when multiple streams are shown (red border will appear around selected stream). |

```js
keyBindings: {
    enabled: true,
    mode: "DEFAULT",
    map: {
        Play: "MediaPlayPause",
        Previous: "MediaPreviousTrack",
        Next: "MediaNextTrack",
    }
}
```

## To-do

Feel free to contribute to the module by adding any of the following features or fixing any of the known issues:

- Add better touchscreen support (use an OnTouch method to play/pause instead of OnClick).

### Known Issues

- snapshots can be stopped by another "instance" of the mirror running in a different window. Expected behavior: should only affect the local window.
- Positioning of the VLC window seems not to work on Wayland-based systems.

## Experimentation

This section includes some untested options and configurations that may be useful in the future.

### Migrating from pre-4.0.0 (and enabling local WebRTC)

1. Remove any `ffmpeg`-specific fields (`protocol`, `frameRate`, `ffmpegPort`, `hwAccel`).
2. Ensure `localPlayer: "vlc"`.
3. Choose playback mode:
   - Local VLC + remote WebRTC → `localPlayer: "vlc"`, `remotePlayer: "webrtc"`.
   - Local WebRTC only → `localPlayer: "webrtc"`, `remotePlayer: "none"`.
   - Local + remote WebRTC → `localPlayer: "webrtc"`, `remotePlayer: "webrtc"`.
4. Add `whepUrl` per stream for any WebRTC usage (both local/remote share it).
5. Provide a WHEP endpoint (e.g. MediaMTX with `whep:` enabled in config).

## Getting Help

**Important:** This module is maintained on a best-effort basis without dedicated support. When seeking help:

1. **Search existing issues** first - your problem may already be documented
2. **Check the [MagicMirror² Forum](https://forum.magicmirror.builders)** for community discussions
3. **When opening an issue**, include:
   - Your complete module configuration
   - Relevant error logs from both console and browser DevTools (`Ctrl+Shift+I`)
   - Your system information (OS, MagicMirror version, etc.)
4. **Be prepared to troubleshoot independently** - responses are not guaranteed

For the best experience, consider using modern alternatives like WebRTC-based solutions for new installations.

## Contributing

If you find any problems, bugs or have questions, please [open a GitHub issue](https://github.com/shbatm/MMM-RTSPStream/issues) in this repository.

Pull requests are of course also very welcome 🙂

### Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

### Developer commands

- `npm install` - Install development dependencies.
- `node --run lint` - Run linting and formatter checks.
- `node --run lint:fix` - Fix linting and formatter issues.
- `node --run test` - Run linting and formatter checks.
- `node --run demo` - Start local WebRTC demo (auto-starts MediaMTX + FFmpeg test stream, then MagicMirror with `demo.config.js`).

**WebRTC demo flow (`node --run demo`):**

1. Starts (or reuses) MediaMTX and checks API readiness on `http://127.0.0.1:9997`.
2. Publishes a local FFmpeg test stream to `rtsp://127.0.0.1:8554/test`.
3. Launches MagicMirror with the bundled demo config (`whepUrl: http://localhost:8889/test/whep`).
4. Stops the helper processes it started when MagicMirror exits.

The demo config uses WebRTC with the local test stream. You can switch between `localPlayer: "vlc"`, `"mplayer"`, or `"webrtc"` to test different playback methods.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

## Changelog

All notable changes to this project will be documented in the [CHANGELOG.md](CHANGELOG.md) file.
