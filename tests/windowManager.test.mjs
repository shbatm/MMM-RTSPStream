import assert from "node:assert/strict";
import createWindowManager from "../scripts/window-manager.js";
import test from "node:test";

const {describe, it} = test;

const createProcess = () => {
  const handlers = new Map();
  return {
    killed: false,
    stderr: {
      removeAllListenersCalled: false,
      removeAllListeners () {
        this.removeAllListenersCalled = true;
      }
    },
    kill () {
      this.killed = true;
    },
    on (event, callback) {
      handlers.set(event, callback);
    },
    emit (event, error) {
      handlers.get(event)?.(error);
    }
  };
};

const createLogger = () => ({
  errors: [],
  infos: [],
  error (message) {
    this.errors.push(message);
  },
  info (message) {
    this.infos.push(message);
  }
});

describe("window manager", () => {
  it("replaces and stops the Devilspie2 process", () => {
    const processes = [];
    const logger = createLogger();
    const manager = createWindowManager({
      logger,
      spawn: () => {
        const process = createProcess();
        processes.push(process);
        return process;
      }
    });

    manager.start("devilspie2", ["--debug"], {env: {}});
    const [firstProcess] = processes;
    manager.start("devilspie2", ["--debug"], {env: {}});

    assert.equal(firstProcess.killed, true);
    assert.equal(manager.isRunning(), true);
    assert.equal(logger.infos.length, 2);

    processes[1].emit("error", new Error("spawn failed"));
    assert.deepEqual(logger.errors, ["DP2: Failed to start."]);

    manager.stop();
    assert.equal(processes[1].killed, true);
    assert.equal(processes[1].stderr.removeAllListenersCalled, true);
    assert.equal(manager.isRunning(), false);
  });

  it("replaces restart timers and clears them on stop", () => {
    const timers = [];
    const clearedTimers = [];
    const logger = createLogger();
    const manager = createWindowManager({
      logger,
      setTimeout: (callback, delay) => {
        const timer = {callback, delay};
        timers.push(timer);
        return timer;
      },
      clearTimeout: (timer) => {
        clearedTimers.push(timer);
      }
    });
    const callbacks = [];

    manager.scheduleRestart(() => callbacks.push("first"), 100);
    manager.scheduleRestart(() => callbacks.push("second"), 200);

    assert.deepEqual(clearedTimers, [timers[0]]);
    assert.equal(timers[1].delay, 200);
    timers[1].callback();
    assert.deepEqual(callbacks, ["second"]);

    manager.scheduleRestart(() => callbacks.push("third"), 300);
    manager.stop();
    assert.deepEqual(clearedTimers, [timers[0], timers[2]]);
  });

  it("hides and unhides windows with wmctrl", async () => {
    const commands = [];
    const logger = createLogger();
    const manager = createWindowManager({
      environ: {DISPLAY: ":9"},
      execFileAsync: (...command) => {
        commands.push(command);
      },
      logger
    });

    await manager.hideWindow("stream;test");
    await manager.unhideWindow("stream;test");

    assert.deepEqual(commands, [
      ["wmctrl", ["-r", "stream;test", "-b", "add,hidden"], {env: {DISPLAY: ":9"}}],
      ["wmctrl", ["-r", "stream;test", "-b", "remove,hidden"], {env: {DISPLAY: ":9"}}],
      ["wmctrl", ["-a", "stream;test"], {env: {DISPLAY: ":9"}}]
    ]);
  });

  it("logs wmctrl errors without rejecting", async () => {
    const logger = createLogger();
    const manager = createWindowManager({
      execFileAsync: () => {
        throw new Error("wmctrl failed");
      },
      logger
    });

    await assert.doesNotReject(() => manager.hideWindow("stream1"));
    assert.match(logger.errors[0], /wmctrl failed/u);
  });
});
