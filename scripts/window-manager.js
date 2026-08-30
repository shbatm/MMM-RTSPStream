const childProcess = require("child_process");
const {promisify} = require("util");

const createWindowManager = function createWindowManager (configuration = {}) {
  const {
    spawn = childProcess.spawn,
    logger = require("logger"),
    clearTimeout: clearTimer = clearTimeout,
    setTimeout: scheduleTimer = setTimeout,
    environ = {...process.env, DISPLAY: ":0"},
    execFileAsync: configuredExecFileAsync,
    execFile: configuredExecFile
  } = configuration;
  const execFileAsync = configuredExecFileAsync || promisify(configuredExecFile || childProcess.execFile);
  let devilspieProcess = null;
  let restartTimer = null;

  const stopProcess = () => {
    if (devilspieProcess) {
      devilspieProcess.stderr.removeAllListeners();
      devilspieProcess.kill();
      devilspieProcess = null;
    }
  };

  const stopRestartTimer = () => {
    if (restartTimer) {
      clearTimer(restartTimer);
      restartTimer = null;
    }
  };

  return {
    get devilspieProcess () {
      return devilspieProcess;
    },

    isRunning () {
      return devilspieProcess !== null;
    },

    start (command, args, options) {
      stopProcess();
      logger.info("DP2: Running window resizers...");
      devilspieProcess = spawn(command, args, options);
      devilspieProcess.on("error", () => {
        logger.error("DP2: Failed to start.");
      });
    },

    stop () {
      stopRestartTimer();
      stopProcess();
    },

    scheduleRestart (callback, delay) {
      stopRestartTimer();
      restartTimer = scheduleTimer(() => {
        restartTimer = null;
        callback();
      }, delay);
    },

    async hideWindow (name) {
      try {
        await execFileAsync("wmctrl", ["-r", name, "-b", "add,hidden"], {env: environ});
      } catch (error) {
        logger.error(`exec error: ${error}`);
      }
    },

    async unhideWindow (name) {
      try {
        await execFileAsync("wmctrl", ["-r", name, "-b", "remove,hidden"], {env: environ});
        await execFileAsync("wmctrl", ["-a", name], {env: environ});
      } catch (error) {
        logger.error(`exec error: ${error}`);
      }
    }
  };
};

module.exports = createWindowManager;
