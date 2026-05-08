import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import url from "node:url";
import vm from "node:vm";

const {describe, it} = test;
const {fileURLToPath} = url;

const timers = [];

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
    setTimeout: (callback, delay) => {
      const id = `timer-${timers.length + 1}`;
      timers.push({callback, delay, id});
      return id;
    },
    WHEPClient: {
      start: () => Promise.resolve({
        stop: () => undefined
      }),
      stop: () => undefined
    }
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

describe("WHEP reconnect logic", () => {
  it("maps known WHEP reasons to readable messages", () => {
    const {definition} = loadDefinition();
    const instance = createInstance(definition);

    assert.equal(instance.getReadableWhepReason("hang-timeout"), "no media progress");
    assert.equal(instance.getReadableWhepReason("NoWhep"), "missing WHEP URL/client");
    assert.equal(instance.getReadableWhepReason("custom-reason"), "custom-reason");
  });

  it("schedules reconnect with backoff when stream is playing", () => {
    timers.length = 0;
    const {definition} = loadDefinition();
    const statusUpdates = [];
    const instance = createInstance(definition, {
      config: {
        whepRestartBaseDelay: 1000,
        whepRestartMaxAttempts: 5,
        whepRestartMaxDelay: 8000
      },
      streams: {
        stream1: {
          playing: true
        }
      },
      props: {
        restartWhep: (stream) => {
          instance.lastRestartedStream = stream;
        },
        setWhepStatus: (stream, message, level) => {
          statusUpdates.push({level, message, stream});
        }
      }
    });

    instance.scheduleWhepRestart("stream1", "start-failed");

    assert.equal(timers.length, 1);
    assert.equal(timers[0].delay, 1000);
    assert.equal(instance.streams.stream1.whepRestartState.attempts, 1);
    assert.equal(instance.streams.stream1.whepRestartState.restarting, true);
    assert.equal(statusUpdates[0].level, "warn");

    timers[0].callback();
    assert.equal(instance.streams.stream1.whepRestartState.timerId, null);
    assert.equal(instance.lastRestartedStream, "stream1");
  });

  it("stops reconnecting when max attempts are exhausted", () => {
    timers.length = 0;
    const {definition} = loadDefinition();
    const statusUpdates = [];
    const instance = createInstance(definition, {
      config: {
        whepRestartMaxAttempts: 2
      },
      streams: {
        stream1: {
          playing: true,
          whepRestartState: {
            attempts: 2,
            lastReason: "",
            restarting: false,
            timerId: null
          }
        }
      },
      props: {
        setWhepStatus: (stream, message, level) => {
          statusUpdates.push({level, message, stream});
        }
      }
    });

    instance.scheduleWhepRestart("stream1", "restart-failed");

    assert.equal(timers.length, 0);
    assert.equal(statusUpdates.length, 1);
    assert.equal(statusUpdates[0].level, "error");
    assert.match(statusUpdates[0].message, /retries exhausted/u);
  });

  it("resets reconnect attempts when stream is stopped", () => {
    const {definition} = loadDefinition();
    const instance = createInstance(definition, {
      streams: {
        stream1: {
          playing: true,
          webrtc: {
            stop: () => {
              instance.sessionStopped = true;
            }
          },
          whepRestartState: {
            attempts: 4,
            lastReason: "restart-failed",
            restarting: true,
            timerId: null
          }
        }
      },
      props: {
        instance: "LOCAL",
        clearWhepRestartTimer: () => undefined,
        cleanupWhepMonitor: () => undefined,
        setWhepStatus: () => undefined
      }
    });

    instance.stopStream("stream1");

    assert.equal(instance.sessionStopped, true);
    assert.equal(instance.streams.stream1.playing, false);
    assert.equal(instance.streams.stream1.whepRestartState.attempts, 0);
    assert.equal(instance.streams.stream1.whepRestartState.restarting, false);
    assert.equal(instance.playing, false);
  });

  it("playStream handles rejected startWhepSession without throwing", async () => {
    const {definition, sandbox} = loadDefinition();
    const surface = {
      muted: false,
      tagName: "VIDEO"
    };
    sandbox.document.getElementById = () => surface;

    const instance = createInstance(definition, {
      config: {
        remotePlayer: "webrtc",
        stream1: {
          whepUrl: "http://localhost:8889/test/whep"
        }
      },
      props: {
        instance: "LOCAL",
        setWhepStatus: () => undefined,
        startWhepSession: () => Promise.reject(new Error("network down")),
        updatePlayPauseBtn: () => undefined
      },
      streams: {
        stream1: {
          playing: false
        }
      }
    });

    assert.doesNotThrow(() => {
      instance.playStream("stream1");
    });

    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    assert.equal(instance.streams.stream1.playing, true);
  });
});
