# MMM-RTSPStream - Video Streaming from Live Feeds (Security Cameras)

This is a module for the [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror/).

This module will show a live RTSP video stream and/or periodic snapshots on the MagicMirror² from any IP Security Camera which supports the [RTSP protocol](https://github.com/shbatm/MMM-RTSPStream/wiki/Stream-URLs-for-Various-Cameras) and/or can serve a snapshot periodically.

> :warning: This module is no longer being actively developed. I will accept PRs and leave the repo active, but will not be directly supporting any issues. If anyone is interested in assuming ownership of the module, please contact @shbatm. :warning:
>
> Why?
>
> - I am no longer using this module on my own mirror. After several years, I found that I use the snapshots much more frequently than I streamed the actual cameras, which can be performed by much simpler modules and methods. To enable streaming, WebRTC (like [MMM-HomeAssistant-WebRTC](https://github.com/Anonym-tsk/MMM-HomeAssistant-WebRTC)) is a newer and better standard with much lower server overhead and latency for delivering RTSP Streams to the frontend than any of the options used here, in the future, this will be the method I focus on and I will not try to shoehorn another technology into this module.

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

- The following packages are required for the module to function fully and the installer will attempt to install them with `apt`:
  - `ffmpeg`, `vlc`, `devilspie2`, `wmctrl`
- For hardware-accelerated streaming, `vlc` is required.
- For manipulating VLC's windows, `devilspie2` and `wmctrl` are used.
- For software-decoded streaming and/or remote browser viewing:
  - Requires `jsmpeg` for front-end display of stream.
  - Requires `node-ffmpeg-stream` Node.js module and `ffmpeg` for backend.
  - Video flow using `'ffmpeg'`: Camera RTSP Stream → `ffmpeg` pre-processor → MM module's `node_helper.js` (via `node-ffmpeg-stream`) → Web Socket (`ws`) → MagicMirror² (via `jsmpeg`)

## Screenshot

![Screenshot with 3 streams](screenshot.png)

## Installation

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

## Using the module

**To use this module, use the configuration builder tool included.**

1. Install the module (see above).
2. Add the following to your config:

   ```js
       {
           module: 'MMM-RTSPStream',
           position: 'middle_center',
           config: {
               initialSetup: true,
           }
       },
   ```

3. Open a web-browser and navigate to: <http://your-mirror-ip:8080/MMM-RTSPStream/config.html>
4. Use the tool to generate your config details.
5. Copy the section you your MagicMirror `config.js` file.
6. Restart the MagicMirror

## Configuration options

It is highly recommended you use the tool included. Several sample configurations are available on [this wiki page](https://github.com/shbatm/MMM-RTSPStream/wiki/Sample-Configurations), detailed options are listed below.

| Option                | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autoStart`           | Start the stream(s) automatically<br>_Default:_ `true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `rotateStreams`       | `true`: Rotate through all streams in a single window<br>`false`: Display an individual window for each stream<br>_Default:_ `true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `rotateStreamTimeout` | Time (in sec) to show each stream when `rotateStreams` is `true`.<br>_Default:_ `10`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `localPlayer`         | _Optional:_ Which player to use for local playback: `vlc` or `ffmpeg`.<br>_Default:_ `vlc` for hardware acceleration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `remotePlayer`        | _Optional:_ Which player to use for remote browser playback: `ffmpeg` or `none`.<br>_Default:_ `ffmpeg`. Set to `none` to disable remote playback.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `remoteSnaps`         | _Optional:_ If `true`, module will continue to show snapshots for any remote browser windows while playing the stream locally. Using `false` will stop updating snapshots when playing locally. Use this option if you only use the local screen to save resources.<br>_Default:_ `true`.                                                                                                                                                                                                                                                                                                                                                                                  |
| `showSnapWhenPaused`  | Whether or not to show snapshots when the stream(s) is paused.<br>_Default:_ `true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `moduleWidth`         | Width in `px` of the module.<br>_Note:_ When `rotateStreams` is `false` and multiple streams are used, adjust this value to adjust the number of streams shown side by side. E.G. to show 2 streams side by side, this value should be `= 2*(Stream Width + 2*1px (border) + 2*15px (margin))`<br>_Default:_ `354px`                                                                                                                                                                                                                                                                                                                                                       |
| `moduleHeight`        | Similar (but less critical) to `moduleWidth`. Adjust to the number of streams high to ensure other modules clear.<br>_Default:_ `240px`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `moduleOffset`        | _Only applies when using VLC._ On some displays, the video does not properly line up with the box on the screen because of differences between JavaScript's reporting and the native display. Entering a pixel value will shift the video over by that amount.<br>_Default:_ `0` _Values:_ Any number (no units) by itself will adjust both top/left the same amount, or you can specify left & top adjustments separately (e.g. `moduleOffset: { left: 10, top: -10 }`                                                                                                                                                                                              |
| `shutdownDelay`       | The time delay (in sec) between when the last client disconnects and the `ffmpeg` or `vlc` stream actually stops. Once created, the websocket continues to run in the background; however, the `ffmpeg` process will only process the camera's stream while there are active connections on the socket (e.g. someone is watching the video on the frontend). When rotating through multiple streams this prevents closing the connection to a stream only to re-open a few seconds later when it comes back through the loop (which reduces the time delay when restarting a stream). To conserve resources on a slow device, you can set this to 0<br>_Default:_ 11 (sec) |
| `debug`               | Set to `true` to show additional logging information.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `streamX`             | The individual stream configuration options. See table below for more details.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### Stream Configuration Options

Each stream you would like to show should be added to the the configuration by adding a `streamX` section, where `X` is the number of the stream (e.g. `stream1`, `stream2`, `stream3`, etc.)

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

| Option            | Description                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`            | _Required_ The name of the individual stream. Will be displayed when paused if snapshots are turned off.                                                                                                                                                                                                                                                                                                                                         |
| `url`             | The url of the RTSP stream. See [this list](https://github.com/shbatm/MMM-RTSPStream/wiki/Stream-URLs-for-Various-Cameras) for paths for some common security cameras. Also see below for how to test for a valid url<br>Username and password should be passed in the url if required: `rtsp://<username>:<password>@<hostname>:<port>/<path>`<br>_Default:_ A test stream at `'rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov'`,          |
| `hdUrl`           | _Optional:_ The url for the "High-Def" stream to use when playing a full screen stream with VLC. If blank, regular url will be used.                                                                                                                                                                                                                                                                                                       |
| `protocol`        | Protocol to use for receiving RTSP stream<br>_Default:_ `"tcp"`, valid options: `"tcp"` or `"udp"`.                                                                                                                                                                                                                                                                                                                                              |
| `snapshotUrl`     | A string with the path to the camera snapshot. This can either be a url to camera itself (if supported) or a file path to where the snapshot is stored every X seconds by the camera. Leave blank to show just the stream title when paused.<br>Username and password should be passed in the url if required: `http://<username>:<password>@<hostname>:<port>/<path>`                                                                           |
| `snapshotType`    | The type of snapshot path given<br>_Values:_ `url` or `file`<br>_Default:_ `url`                                                                                                                                                                                                                                                                                                                                                                 |
| `snapshotRefresh` | How often to refresh the snapshot image (in sec).<br>_Default:_ 10 (seconds)                                                                                                                                                                                                                                                                                                                                                                     |
| `frameRate`       | Framerate to use for the RTSP stream. Must be a string.<br>_Default:_ `"30"`                                                                                                                                                                                                                                                                                                                                                                     |
| `width`           | The width in px of the stream.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `height`          | The height in px of the stream.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `absPosition`     | _Only required for VLC_ Provide an absolute potiion to show the stream. This overrides the automatic window and moduleOffset settings.<br>_Format:_ `{ top: XX, right: XX, bottom: XX, left: XX }` where `XX` is the pixel position on the screen.                                                                                                                                                                                         |
| `ffmpegPort`      | _Only required for `ffmpeg`_ Any available port to use for the ffmpeg websocket.<br>**_Notes:_** **THIS IS NOT THE PORT FOR YOUR CAMERA** Camera stream's port must be included in the URL above. This port must be unqiue for each stream added and cannot be used by another service on the server. This is a separate WebSocket from the the Socket.IO connection between the module's script and it's `node_helper.js`.<br>_Default:_ `9999` |
| `hwAccel`         | _Only required for `ffmpeg`_ Attempt to use Hardware Accelerated Decoding with `ffmpeg`.<br>_Default:_ `false`                                                                                                                                                                                                                                                                                                                                   |
| `muted`           | Disable sound (_VLC only_)<br>_Default:_ `false`                                                                                                                                                                                                                                                                                                                                                                                   |

#### Testing a camera feed

To test to make sure you have a working url for a camera feed: create a text file with the URL as the first and only line in the file. Save the file as `<somename>.strm` and open the file with a video player like [VLC](https://www.videolan.org/vlc/#download).

#### Advanced Stream Configurations

This module has been tested exclusively with streams for Hikvision (Swann) cameras. You may find that you need to adjust the `ffmpeg` settings that are used beyond just frame rate and size. The command line arguements for `ffmpeg` can be changed by editing the stream configuration options in the `node-ffmpeg-stream` module. The `ffmpeg` arguement list is passed as an options object.

```shell
# Configuration is now done via the stream configuration options
# See: https://www.npmjs.com/package/node-ffmpeg-stream
```

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

- Add better touchscreen support (use an OnTouch method to play/pause instead of OnClick).
- KNOWN ISSUE: snapshots can be stopped by another "instance" of the mirror running in a different window. Expected behavior: should only affect the local window.
- Known Issue: `ffmpeg` streams can sometimes start and stop erratically when using a WiFi connection. For best results, use a hard-wired Ethernet connection.

## Experimentation

This section includes some untested options and configurations that may be useful in the future.

### Use `ffmpeg` to capture snapshots from an RTSP Stream

```js
// Grab a frame every x seconds and save as thumb.png:
ffmpeg -i {RTSP_SOURCE} -f image2 -vf fps=fps=1/{x} -update 1 thumb.png

// Grab the first frame from a stream and save as thumb.jpg
ffmpeg -i {RTSP_SOURCE} -ss 00:00:01.500 -f image2 -vframes 1 thumb.png
```

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
- `sh scripts/start_local_rtsp_server.sh` - Start a local RTSP server with a test stream for development purposes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

## Changelog

All notable changes to this project will be documented in the [CHANGELOG.md](CHANGELOG.md) file.

([source](https://superuser.com/questions/663928/ffmpeg-to-capture-stills-from-h-264-stream))
