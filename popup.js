const PAGE_NAME = "popup.js";
const CONNECTION_WITH_BACKGROUND_NAME = "popup-background-connection";
const COMMAND_START_RECORDING = "start-recording";
const COMMAND_STOP_RECORDING = "stop-recording";
const COMMAND_TRANSCRIPTION_RESULT = "transcription-result";
let isRecording = false;
let port = null;

document.addEventListener("DOMContentLoaded", () => {
	port = chrome.runtime.connect({ name: CONNECTION_WITH_BACKGROUND_NAME });

	setupRecordStopButton();
	setupClipboardButton();

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
			document.getElementById(COMMAND_TRANSCRIPTION_RESULT).textContent =
				message.transcription || "No transcription available.";
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
	document
		.getElementById("copy-to-clipboard")
		.addEventListener("click", () => {
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
