/* eslint-disable func-names */
// Helper functions to replace jQuery functionality
const getValue = (selector) => {
  const element = document.querySelector(selector);
  return element
    ? element.value
    : "";
};

const getCheckedValue = (selector) => {
  const element = document.querySelector(selector);
  return element
    ? element.value
    : "";
};

const hideElements = (className) => {
  const elements = document.querySelectorAll(className);
  elements.forEach((el) => el.classList.add("hidden"));
};

const showElements = (className) => {
  const elements = document.querySelectorAll(className);
  elements.forEach((el) => el.classList.remove("hidden"));
};

const generateConfig = () => {
  let s = `{
    module: "MMM-RTSPStream",
    position: "${getValue("#position")}",
    `;

  if (getValue("#headerText") !== "") {
    s += `header: "${getValue("#headerText")}",
        `;
  }

  s += `config: {
        autoStart: ${getCheckedValue("input[name=autoStart]:checked")},
        rotateStreams: ${getCheckedValue("input[name=rotateStreams]:checked")},
        `;

  if (getCheckedValue("input[name=rotateStreams]:checked") === "true") {
    s += `rotateStreamTimeout: ${getValue("#rotateStreamTimeout")},
        `;
  }

  s += `moduleWidth: ${getValue("#moduleWidth")},
        moduleHeight: ${getValue("#moduleHeight")},
        localPlayer: '${getValue("#localPlayer")}',
        remotePlayer: '${getValue("#remotePlayer")}',
        showSnapWhenPaused: ${getCheckedValue("input[name=showSnapWhenPaused]:checked")},
        remoteSnaps: ${getCheckedValue("input[name=remoteSnaps]:checked")},
        `;

  if (getValue("#moduleOffset") !== "") {
    s += `moduleOffset: ${getValue("#moduleOffset")},
        `;
  }

  if (
    ["ffmpeg", "vlc"].indexOf(getValue("#localPlayer")) !== -1 ||
    getValue("#remotePlayer") === "ffmpeg"
  ) {
    s += `shutdownDelay: ${getValue("#s1shutdownDelay")},
        `;
  }

  // Generate stream configurations based on selected count
  const streamCount = parseInt(getCheckedValue("input[name=streamCount]:checked"), 10) || 1;

  for (let i = 1; i <= streamCount; i += 1) {
    s += `stream${i}: {
            name: '${getValue(`#s${i}Name`)}',
            url: '${getValue(`#s${i}url`)}',
            width: undefined,
            height: undefined,
            `;

    if (getValue("#localPlayer") === "vlc") {
      s += `muted: true,
            `;
    }

    if (
      getValue("#localPlayer") === "ffmpeg" ||
      getValue("#remotePlayer") === "ffmpeg"
    ) {
      s += `ffmpegPort: ${9999 + i - 1},
            `;
    }

    s += `},
        `;
  }

  s += `}
},`;

  document.querySelector("#configResult").value = s;
};

const copyToClipboard = () => {
  navigator.clipboard.writeText(document.querySelector("#configResult").value);
};

// Initialize the application
const initializeApp = () => {
  // Hide elements initially
  hideElements(".ffmpeg");
  hideElements(".count-2");
  hideElements(".count-3");
  hideElements(".count-4");

  // Event listeners for rotateStreams
  const rotateStreamsInputs = document.querySelectorAll("input[name=rotateStreams]");
  rotateStreamsInputs.forEach((input) => {
    input.addEventListener("change", function () {
      if (this.value === "true") {
        showElements(".rotateStreamTimeout");
      } else {
        hideElements(".rotateStreamTimeout");
      }
    });
  });

  // Event listeners for showSnapWhenPaused
  const showSnapInputs = document.querySelectorAll("input[name=showSnapWhenPaused]");
  showSnapInputs.forEach((input) => {
    input.addEventListener("change", function () {
      if (this.value === "true") {
        showElements(".snapshotDetails");
      } else {
        hideElements(".snapshotDetails");
      }
    });
  });

  // Event listeners for remotePlayer
  const remotePlayerSelect = document.querySelector("select[name=remotePlayer]");
  if (remotePlayerSelect) {
    remotePlayerSelect.addEventListener("change", function () {
      const localPlayerValue = getValue("#localPlayer");
      if (this.value === "ffmpeg" || localPlayerValue === "ffmpeg") {
        showElements(".ffmpeg");
      } else {
        hideElements(".ffmpeg");
      }
    });
  }

  // Event listeners for localPlayer
  const localPlayerSelect = document.querySelector("select[name=localPlayer]");
  if (localPlayerSelect) {
    localPlayerSelect.addEventListener("change", function () {
      const remotePlayerValue = getValue("#remotePlayer");
      if (this.value === "ffmpeg" || remotePlayerValue === "ffmpeg") {
        showElements(".ffmpeg");
      } else {
        hideElements(".ffmpeg");
      }
      if (this.value === "vlc") {
        showElements(".vlc");
      } else {
        hideElements(".vlc");
      }
    });
  }

  // Event listeners for streamCount
  const streamCountInputs = document.querySelectorAll("input[name=streamCount]");
  streamCountInputs.forEach((input) => {
    input.addEventListener("change", function () {
      if (this.value === "1") {
        hideElements(".count-2");
        hideElements(".count-3");
        hideElements(".count-4");
      } else if (this.value === "2") {
        showElements(".count-2");
        hideElements(".count-3");
        hideElements(".count-4");
      } else if (this.value === "3") {
        showElements(".count-2");
        showElements(".count-3");
        hideElements(".count-4");
      } else if (this.value === "4") {
        showElements(".count-2");
        showElements(".count-3");
        showElements(".count-4");
      }
    });
  });

  // Add smooth scroll behavior for form navigation
  document.querySelectorAll("a[href^=\"#\"]").forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });

  // Add form validation feedback
  const inputs = document.querySelectorAll(".input, .select, .textarea");
  inputs.forEach((input) => {
    input.addEventListener("blur", function () {
      if (this.hasAttribute("required") && !this.value.trim()) {
        this.style.borderColor = "#dc3545";
      } else {
        this.style.borderColor = "#e9ecef";
      }
    });
  });

  // Add keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Ctrl/Cmd + Enter to generate config
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      generateConfig();
    }
  });

  // Add event listener for generate button
  const generateButton = document.querySelector("#generate");
  if (generateButton) {
    generateButton.addEventListener("click", generateConfig);
  }

  // Add event listener for copy button
  const copyButton = document.querySelector("#copyButton");
  if (copyButton) {
    copyButton.addEventListener("click", copyToClipboard);
  }
};

// Document ready replacement
document.addEventListener("DOMContentLoaded", initializeApp);
