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
  let configText = `{
    module: "MMM-RTSPStream",
    position: "${getValue("#position")}",
    `;

  if (getValue("#headerText") !== "") {
    configText += `header: "${getValue("#headerText")}",
        `;
  }

  configText += `config: {
        autoStart: ${getCheckedValue("input[name=autoStart]:checked")},
        rotateStreams: ${getCheckedValue("input[name=rotateStreams]:checked")},
        `;

  if (getCheckedValue("input[name=rotateStreams]:checked") === "true") {
    configText += `rotateStreamTimeout: ${getValue("#rotateStreamTimeout")},
        `;
  }

  configText += `moduleWidth: ${getValue("#moduleWidth")},
        moduleHeight: ${getValue("#moduleHeight")},
        localPlayer: '${getValue("#localPlayer")}',
        remotePlayer: '${getValue("#remotePlayer")}',
        showSnapWhenPaused: ${getCheckedValue("input[name=showSnapWhenPaused]:checked")},
        remoteSnaps: ${getCheckedValue("input[name=remoteSnaps]:checked")},
        `;

  if (getValue("#moduleOffset") !== "") {
    configText += `moduleOffset: ${getValue("#moduleOffset")},
        `;
  }

  if (
    ["vlc", "mplayer"].indexOf(getValue("#localPlayer")) !== -1
  ) {
    configText += `shutdownDelay: ${getValue("#s1shutdownDelay")},
        `;
  }

  const usesWebrtc =
    getValue("#localPlayer") === "webrtc" ||
    getValue("#remotePlayer") === "webrtc";

  // Generate stream configurations based on selected count
  const streamCount = parseInt(getCheckedValue("input[name=streamCount]:checked"), 10) || 1;

  for (let streamIndex = 1; streamIndex <= streamCount; streamIndex += 1) {
    configText += `stream${streamIndex}: {
            name: '${getValue(`#s${streamIndex}Name`)}',
            url: '${getValue(`#s${streamIndex}url`)}',
          `;

    if (usesWebrtc) {
      configText += `whepUrl: '${getValue(`#s${streamIndex}whepUrl`)}',
          `;
    }

    configText += `width: undefined,
          height: undefined,
          `;

    if (getValue("#localPlayer") === "vlc") {
      configText += `muted: true,
            `;
    }

    configText += `},
        `;
  }

  configText += `}
},`;

  document.querySelector("#configResult").value = configText;
};

const copyToClipboard = () => {
  navigator.clipboard.writeText(document.querySelector("#configResult").value);
};

// Initialize the application
const initializeApp = () => {
  // Hide elements initially
  hideElements(".webrtc");
  hideElements(".count-2");
  hideElements(".count-3");
  hideElements(".count-4");

  // Event listeners for rotateStreams
  const rotateStreamsInputs = document.querySelectorAll("input[name=rotateStreams]");
  rotateStreamsInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      if (event.currentTarget.value === "true") {
        showElements(".rotateStreamTimeout");
      } else {
        hideElements(".rotateStreamTimeout");
      }
    });
  });

  // Event listeners for showSnapWhenPaused
  const showSnapInputs = document.querySelectorAll("input[name=showSnapWhenPaused]");
  showSnapInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      if (event.currentTarget.value === "true") {
        showElements(".snapshotDetails");
      } else {
        hideElements(".snapshotDetails");
      }
    });
  });

  // Event listeners for remotePlayer
  const remotePlayerSelect = document.querySelector("select[name=remotePlayer]");
  if (remotePlayerSelect) {
    remotePlayerSelect.addEventListener("change", (event) => {
      const localPlayerValue = getValue("#localPlayer");
      if (event.currentTarget.value === "webrtc" || localPlayerValue === "webrtc") {
        showElements(".webrtc");
      } else {
        hideElements(".webrtc");
      }
    });
  }

  // Event listeners for localPlayer
  const localPlayerSelect = document.querySelector("select[name=localPlayer]");
  if (localPlayerSelect) {
    localPlayerSelect.addEventListener("change", (event) => {
      const remotePlayerValue = getValue("#remotePlayer");
      if (event.currentTarget.value === "webrtc" || remotePlayerValue === "webrtc") {
        showElements(".webrtc");
      } else {
        hideElements(".webrtc");
      }
      if (event.currentTarget.value === "vlc" || event.currentTarget.value === "mplayer") {
        showElements(".shutdownDelay");
      } else {
        hideElements(".shutdownDelay");
      }
    });
  }

  // Event listeners for streamCount
  const streamCountInputs = document.querySelectorAll("input[name=streamCount]");
  streamCountInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      if (event.currentTarget.value === "1") {
        hideElements(".count-2");
        hideElements(".count-3");
        hideElements(".count-4");
      } else if (event.currentTarget.value === "2") {
        showElements(".count-2");
        hideElements(".count-3");
        hideElements(".count-4");
      } else if (event.currentTarget.value === "3") {
        showElements(".count-2");
        showElements(".count-3");
        hideElements(".count-4");
      } else if (event.currentTarget.value === "4") {
        showElements(".count-2");
        showElements(".count-3");
        showElements(".count-4");
      }
    });
  });

  // Add smooth scroll behavior for form navigation
  document.querySelectorAll("a[href^=\"#\"]").forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      const target = document.querySelector(event.currentTarget.getAttribute("href"));
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
    input.addEventListener("blur", (event) => {
      if (event.currentTarget.hasAttribute("required") && !event.currentTarget.value.trim()) {
        event.currentTarget.style.borderColor = "#dc3545";
      } else {
        event.currentTarget.style.borderColor = "#e9ecef";
      }
    });
  });

  // Add keyboard shortcuts
  document.addEventListener("keydown", (event) => {
    // Ctrl/Cmd + Enter to generate config
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
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

  // Apply initial visibility based on default selections.
  if (localPlayerSelect) {
    localPlayerSelect.dispatchEvent(new Event("change"));
  }
  if (remotePlayerSelect) {
    remotePlayerSelect.dispatchEvent(new Event("change"));
  }
};

// Document ready replacement
document.addEventListener("DOMContentLoaded", initializeApp);
