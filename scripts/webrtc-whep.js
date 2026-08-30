/**
 * Minimal WHEP (WebRTC-HTTP Egress Protocol) client helper.
 * Connects to a WHEP endpoint and attaches the remote MediaStream to a <video> element.
 * No external deps; uses browser WebRTC APIs.
 */
(() => {
  const DEFAULT_RECONNECT_DELAY_MS = 3000;
  const MAX_RECONNECT_ATTEMPTS = 5;

  /**
   * Wait for ICE gathering to complete (required for non-trickle WHEP servers).
   * @param {RTCPeerConnection} pc
   * @returns {Promise<void>}
   */
  const waitForIceGathering = (pc) => new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
  });

  /**
   * Validate URL format.
   * @param {string} url
   * @returns {boolean}
   */
  const isValidUrl = (url) => {
    try {
      const parsed = new URL(url);
      return Boolean(parsed.protocol);
    } catch {
      return false;
    }
  };

  /**
   * No-op function for ignoring expected errors.
   */
  const noop = Function.prototype;

  /**
   * Start a WHEP session.
   * @param {HTMLVideoElement} videoEl - Target video element
   * @param {string} whepUrl - WHEP endpoint URL
   * @param {Object} [opts] - Options
   * @param {RTCConfiguration} [opts.rtcConfig] - RTCPeerConnection config
   * @param {boolean} [opts.audio=true] - Enable audio transceiver
   * @param {boolean} [opts.autoReconnect=true] - Auto-reconnect on failure
   * @param {Function} [opts.onError] - Error callback
   * @returns {Promise<{pc: RTCPeerConnection, stop: Function}>}
   */
  const start = async (videoEl, whepUrl, opts = {}) => {
    if (!isValidUrl(whepUrl)) {
      throw new Error(`Invalid WHEP URL: ${whepUrl}`);
    }

    const {rtcConfig = {}, audio = true, autoReconnect = true, onError = noop} = opts;

    let reconnectAttempts = 0;
    let stopped = false;
    let pc = null;

    const connect = async () => {
      pc = new RTCPeerConnection(rtcConfig);

      pc.addTransceiver("video", {direction: "recvonly"});
      if (audio) {
        pc.addTransceiver("audio", {direction: "recvonly"});
      }

      pc.addEventListener("track", (event) => {
        const [stream] = event.streams || [];
        if (stream && videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
          videoEl.play().catch(noop);
        }
      });

      pc.addEventListener("connectionstatechange", () => {
        if (stopped) {
          return;
        }
        const {connectionState} = pc;
        if (connectionState === "failed" || connectionState === "disconnected") {
          onError(`WebRTC connection ${connectionState}`);
          if (autoReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts += 1;
            setTimeout(() => {
              if (!stopped) {
                connect().catch(onError);
              }
            }, DEFAULT_RECONNECT_DELAY_MS);
          }
        } else if (connectionState === "connected") {
          reconnectAttempts = 0;
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const res = await fetch(whepUrl, {
        method: "POST",
        headers: {"Content-Type": "application/sdp"},
        body: pc.localDescription.sdp
      });

      if (!res.ok) {
        throw new Error(`WHEP negotiation failed: ${res.status} ${res.statusText}`);
      }

      await pc.setRemoteDescription({
        type: "answer",
        sdp: await res.text()
      });

      return pc;
    };

    const stop = () => {
      stopped = true;
      if (pc) {
        pc.getReceivers().forEach((r) => r.track?.stop());
        pc.close();
        pc = null;
      }
      if (videoEl) {
        videoEl.pause();
        videoEl.srcObject = null;
      }
    };

    await connect();
    return {pc, stop};
  };

  window.WHEPClient = {start};
})();
