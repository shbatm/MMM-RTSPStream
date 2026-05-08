import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import url from "node:url";
import vm from "node:vm";

const {describe, it} = test;
const {fileURLToPath} = url;

const createSandbox = () => {
  const sandbox = {
    clearInterval,
    clearTimeout,
    document: {
      getElementById: () => null
    },
    KeyHandler: {
      register: () => undefined,
      unregister: () => undefined
    },
    location: {
      hostname: "localhost",
      port: "8080"
    },
    Log: {
      debug: () => undefined,
      error: () => undefined,
      log: () => undefined,
      warn: () => undefined
    },
    MM: {
      getModules: () => ({
        enumerate: () => undefined
      })
    },
    Module: {
      register: (_name, definition) => {
        sandbox.definition = definition;
      }
    },
    setInterval,
    setTimeout
  };

  sandbox.global = sandbox;

  return sandbox;
};

const loadDefinition = () => {
  const testsDir = path.dirname(fileURLToPath(import.meta.url));
  const modulePath = path.resolve(testsDir, "../MMM-RTSPStream.js");
  const code = fs.readFileSync(modulePath, "utf8");
  const sandbox = createSandbox();

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, {filename: "MMM-RTSPStream.js"});

  return {definition: sandbox.definition, sandbox};
};

const createInstance = (definition, options = {}) => {
  const streamDefaults = {...definition.defaults.stream1};
  const streamConfigOverride = options.config?.stream1 ?? {};
  const config = {
    ...definition.defaults,
    ...options.config,
    stream1: {
      ...streamDefaults,
      ...streamConfigOverride
    }
  };

  const instance = {
    ...definition,
    config,
    currentStream: "stream1",
    name: "MMM-RTSPStream",
    playing: false,
    streams: options.streams || {
      stream1: {
        playing: false
      }
    },
    suspended: false
  };

  return Object.assign(instance, options.props || {});
};

describe("module lifecycle and UI helpers", () => {
  it("rotateStream wraps around and updates snapshot state", () => {
    const {definition} = loadDefinition();
    const notifications = [];
    const snapshotCalls = [];
    const instance = createInstance(definition, {
      streams: {
        stream1: {playing: false},
        stream2: {playing: false},
        stream3: {playing: false}
      },
      props: {
        currentIndex: 2,
        currentStream: "stream3",
        playing: false,
        playSnapshots: (stream) => {
          snapshotCalls.push(stream);
        },
        sendSocketNotification: (type, payload) => {
          notifications.push({payload, type});
        }
      }
    });

    instance.rotateStream();

    assert.equal(instance.currentIndex, 0);
    assert.equal(instance.currentStream, "stream1");
    assert.equal(snapshotCalls[0], "stream1");
    assert.deepEqual(notifications[0], {payload: "stream3", type: "SNAPSHOT_STOP"});
  });

  it("suspend stops streams and resumed restarts rotation", () => {
    const {definition} = loadDefinition();
    const calls = [];
    const instance = createInstance(definition, {
      config: {
        autoStart: true,
        rotateStreams: true
      },
      props: {
        loaded: true,
        selectStream: (_direction, clear) => {
          calls.push({clear, fn: "selectStream"});
        },
        selectedStream: "stream2",
        setupStreamRotation: () => {
          calls.push({fn: "setupStreamRotation"});
        },
        stopAllStreams: (startSnapshots) => {
          calls.push({fn: "stopAllStreams", startSnapshots});
        }
      }
    });

    instance.suspend();
    assert.equal(instance.suspended, true);
    assert.deepEqual(calls[0], {fn: "stopAllStreams", startSnapshots: false});
    assert.deepEqual(calls[1], {clear: true, fn: "selectStream"});

    instance.resumed();
    assert.equal(instance.suspended, false);
    assert.deepEqual(calls[2], {fn: "setupStreamRotation"});
  });

  it("setWhepStatus toggles overlay visibility and level", () => {
    const {definition, sandbox} = loadDefinition();
    const rotateOverlayId = "status_";
    const streamOverlayId = "status_stream1";
    const overlayById = new Map([
      [rotateOverlayId, {className: "", textContent: ""}],
      [streamOverlayId, {className: "", textContent: ""}]
    ]);
    const requestedIds = [];
    sandbox.document.getElementById = (id) => {
      requestedIds.push(id);
      return overlayById.get(id) || null;
    };

    const instance = createInstance(definition, {
      config: {
        rotateStreams: false,
        showWhepStatusOverlay: true
      }
    });

    instance.setWhepStatus("stream1", "Reconnecting", "warn");
    assert.equal(requestedIds[0], streamOverlayId);
    assert.equal(overlayById.get(streamOverlayId).textContent, "Reconnecting");
    assert.equal(overlayById.get(streamOverlayId).className, "MMM-RTSPStream statusOverlay warn");

    instance.setWhepStatus("stream1", "", "info");
    assert.equal(overlayById.get(streamOverlayId).className, "MMM-RTSPStream statusOverlay info hidden");

    instance.config.rotateStreams = true;
    instance.setWhepStatus("stream1", "Failed", "error");
    assert.equal(overlayById.get(rotateOverlayId).textContent, "Failed");
    assert.equal(overlayById.get(rotateOverlayId).className, "MMM-RTSPStream statusOverlay error");
    assert.equal(requestedIds.at(-1), rotateOverlayId);
  });
});
