const PAGE_NAME = "popup.js";
const CONNECTION_WITH_BACKGROUND_NAME = "popup-background-connection";
const COMMAND_START_RECORDING = "start-recording";
const COMMAND_STOP_RECORDING = "stop-recording";
const COMMAND_TRANSCRIPTION_RESULT = "transcription-result";
let isRecording = false;
let port = null;

document.addEventListener("DOMContentLoaded", () => {
  port = chrome.runtime.connect({ name: CONNECTION_WITH_BACKGROUND_NAME });

  loadLastTranscription();
  setupRecordStopButton();
  setupClipboardButton();
  setupAPIKeySaveButton();
  setupPostProcessingButton();

  // Listen for messages from the background script
  port.onMessage.addListener((message) => {
    if (message.command === `${CONNECTION_WITH_BACKGROUND_NAME}-accepted`) {
      console.log(
        `${PAGE_NAME}: connection ${CONNECTION_WITH_BACKGROUND_NAME} accepted: ${message.content}`
      );
    } else if (message.command === `${COMMAND_START_RECORDING}-accepted`) {
      console.log(
        `${PAGE_NAME}: request ${COMMAND_START_RECORDING} accepted: ${message.content}`
      );
    } else if (message.command === `${COMMAND_STOP_RECORDING}-accepted`) {
      console.log(
        `${PAGE_NAME}: request ${COMMAND_STOP_RECORDING} accepted: ${message.content}`
      );
    } else if (message.command === COMMAND_TRANSCRIPTION_RESULT) {
      if (message.transcription) {
        document.getElementById(COMMAND_TRANSCRIPTION_RESULT).textContent =
          message.transcription;
        saveLastTranscription(message.transcription);
      }
    }
  });
});

function setupRecordStopButton() {
  const button = document.getElementById("record-toggle");
  button.addEventListener("click", () => {
    isRecording = !isRecording; // Toggle the recording state
    updateRecordingState(button, isRecording);
  });
}

function updateRecordingState(button, isRecording) {
  if (isRecording) {
    button.textContent = "Stop Recording";
    port.postMessage({ command: COMMAND_START_RECORDING });
  } else {
    button.textContent = "Start Recording";
    port.postMessage({ command: COMMAND_STOP_RECORDING });
  }
}

function setupClipboardButton() {
  document.getElementById("copy-to-clipboard").addEventListener("click", () => {
    const textToCopy = document.getElementById(
      COMMAND_TRANSCRIPTION_RESULT
    ).innerText;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        // Optionally, notify the user that the text was copied.
        console.log("Text copied to clipboard");
      })
      .catch((err) => {
        console.error("Error in copying text: ", err);
      });
  });
}

function setupAPIKeySaveButton() {
  document.getElementById("saveButton").addEventListener("click", function () {
    const apiKeyInput = document.getElementById("apiKeyInput");
    const apiKey = apiKeyInput.value;

    chrome.storage.local.set({ apiKey: apiKey }, function () {
      if (chrome.runtime.lastError) {
        console.error("Error saving API Key:", chrome.runtime.lastError);
      } else {
        apiKeyInput.value = "";
        console.log("API Key saved successfully");
      }
    });
  });
}

function setupPostProcessingButton() {
  const postProcessingCheckbox = document.getElementById("postProcessing");
  const onClickHandler = (event) => {
    chrome.storage.local.set(
      { postProcessing: event.target.checked },
      function () {
        if (chrome.runtime.lastError) {
          console.error(
            "Error saving postProcessing selection: ",
            chrome.runtime.lastError
          );
        } else {
          apiKeyInput.value = "";
          console.log("postProcessing selection saved successfully");
        }
      }
    );
  };

  postProcessingCheckbox.addEventListener("click", onClickHandler);
  onClickHandler({ target: { checked: false } });
}

function loadLastTranscription() {
  // Load and display the stored transcription when the popup opens
  chrome.storage.local.get("transcription", function (result) {
    if (result.transcription) {
      document.getElementById(COMMAND_TRANSCRIPTION_RESULT).textContent =
        result.transcription;
    }
  });
}

function saveLastTranscription(transcription) {
  // Save transcription to be display when the popup opens
  chrome.storage.local.set({ transcription });
}
