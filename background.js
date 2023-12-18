const PAGE_NAME = "background.js";
const POPUP_CONNECTION_NAME = "popup-background-connection";
const CONTENT_CONNECTION_NAME = "content-background-connection";
const COMMAND_START_RECORDING = "start-recording";
const COMMAND_STOP_RECORDING = "stop-recording";
const COMMAND_TRANSCRIPTION_RESULT = "transcription-result";
const COMMAND_AUDIO_DATA = "audio-data";

let popupPort = null;
let contentPorts = {}; // Use an object to manage multiple contentPorts

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
    const tabId = port.sender.tab.id;
    contentPorts[tabId] = port;

    console.log(
      `${PAGE_NAME}: Connected to content script in ${port.sender.tab.name}`
    );

    port.onMessage.addListener((message) => {
      handleContentMessage(message);
    });

    port.onDisconnect.addListener(() => {
      console.log(
        `${PAGE_NAME}: Disconnected from content script in tab ${tabId}.`
      );
      delete contentPorts[tabId];
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
      }

      const contentPort = contentPorts[tabs?.[0].id];
      if (!contentPort) {
        console.error("ContentScript.js connection fell.");
        return;
      } else {
        contentPort.postMessage({ command });
        console.log(`${PAGE_NAME}: command '${command} send to contentScript`);
      }
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
  const callback = (data) => sendTranscriptionToPopup(data);

  getPostProcessingSelection((postProcessing) => {
    if (postProcessing) {
      sendToTranscriptionAPI(blob, (data) => postProcessAPI(data, callback));
    } else {
      sendToTranscriptionAPI(blob, callback);
    }
  });
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
    }
  });
}

function getPostProcessingSelection(callback) {
  chrome.storage.local.get("postProcessing", function (result) {
    if (result.postProcessing) {
      callback(result.postProcessing);
    } else {
      callback(false);
    }
  });
}

function sendToTranscriptionAPI(blob, callback) {
  useApiKey((apiKey) => {
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "en");
    formData.append("response_format", "json");
    formData.append("temperature", 0.2); // Adjust as needed

    fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Transcription API response error: ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((data) => {
        console.log("Transcription result:", data.text);
        callback(data.text);
      })
      .catch((error) => {
        console.error("Error sending audio to transcription API:", error);
      });
  });
}

function postProcessAPI(transcript, callback) {
  useApiKey((apiKey) => {
    const requestBody = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in journaling, writing emails, and any kind of text creation. Your job is to receive transcriptions from an audio file and convert it into a clear, well-formatted text, that follows all best practices, like bullet points, numbered lists, paragraphs, and punctuation.\nPlease make sure that the output is genuine to the input, simply make it clear while having the same vocabulary, and avoid adding expressions or phrases that were not said.",
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      temperature: 0.3,
      max_tokens: 1028,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    };

    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Completion API response error: ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((data) => {
        const postProcessedResponse = data?.choices[0]?.message?.content;

        if (!postProcessedResponse)
          throw new Error("Post-Processing API didn't provide any suggestion.");

        console.log("Post-processing result: ", postProcessedResponse);
        callback(postProcessedResponse);
      })
      .catch((error) => {
        console.error("Error during post-processing: ", error);
      });
  });
}
