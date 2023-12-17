const PAGE_NAME = "background.js";
const POPUP_CONNECTION_NAME = "popup-background-connection";
const CONTENT_CONNECTION_NAME = "content-background-connection";
const COMMAND_START_RECORDING = "start-recording";
const COMMAND_STOP_RECORDING = "stop-recording";
const COMMAND_TRANSCRIPTION_RESULT = "transcription-result";
const COMMAND_AUDIO_DATA = "audio-data";

let popupPort = null;
let contentPort = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === POPUP_CONNECTION_NAME) {
    popupPort = port;
    console.log(`${PAGE_NAME}: Connected to popup.`);

    popupPort.postMessage({
      command: `${POPUP_CONNECTION_NAME}-accepted`,
      content: "Connection established.",
    });

    popupPort.onMessage.addListener((message) => {
      handlePopupMessage(message);
    });

    popupPort.onDisconnect.addListener(() => {
      console.log(`${PAGE_NAME}: Disconnected from popup.`);
      popupPort = null;
    });
  } else if (port.name === CONTENT_CONNECTION_NAME) {
    contentPort = port;
    console.log(`${PAGE_NAME}: Connected to content script.`);

    contentPort.onMessage.addListener((message) => {
      handleContentMessage(message);
    });

    contentPort.onDisconnect.addListener(() => {
      console.log(`${PAGE_NAME}: Disconnected from content script.`);
      contentPort = null;
    });
  }
});

function handlePopupMessage(message) {
  if (
    message.command === COMMAND_START_RECORDING ||
    message.command === COMMAND_STOP_RECORDING
  ) {
    sendCommandToContentScript(message.command);
  }
}

function handleContentMessage(message) {
  if (message.command === COMMAND_AUDIO_DATA) {
    handleAudioData(message.data);
  }
}

function sendCommandToContentScript(command) {
  chrome.windows.getCurrent((w) => {
    chrome.tabs.query({ active: true, windowId: w.id }, function (tabs) {
      if (tabs.length === 0) {
        console.error(`${PAGE_NAME}: No active tab found.`);
        return;
      }
      if (contentPort) {
        contentPort.postMessage({ command });
        console.log(`${PAGE_NAME}: command '${command} send to contentScript`);
      } else console.error("ContentScript.js connection fell.");
    });
  });
}

function sendTranscriptionToPopup(transcription) {
  if (popupPort) {
    popupPort.postMessage({
      command: COMMAND_TRANSCRIPTION_RESULT,
      transcription,
    });
    console.log(`${PAGE_NAME}: Transcription result sent to popup.`);
  } else {
    console.error(`${PAGE_NAME}: No active connection to popup.`);
  }
}

function handleAudioData(dataURL) {
  const blob = dataURLToBlob(dataURL);
  sendToTranscriptionAPI(blob);
}

function dataURLToBlob(dataURL) {
  const byteString = atob(dataURL.split(",")[1]);
  const mimeString = dataURL.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeString });
}

function useApiKey(callback) {
  chrome.storage.local.get("apiKey", function (result) {
    if (result.apiKey) {
      callback(result.apiKey);
    } else {
      console.error("No API Key found");
      // Handle the absence of the API key appropriately
    }
  });
}

function sendToTranscriptionAPI(blob) {
  useApiKey((apiKey) => {
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "en");
    formData.append("response_format", "json");
    formData.append("temperature", 0.2); // Adjust as needed

    // Replace with your actual API endpoint and API key
    const apiEndpoint = "https://api.openai.com/v1/audio/transcriptions";

    fetch(apiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API response error: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Transcription result:", data.text);
        // Process the transcription result
        sendTranscriptionToPopup(data.text);
      })
      .catch((error) => {
        console.error("Error sending audio to transcription API:", error);
      });
  });
}
