const PAGE_NAME = "contentScript.js";
const CONNECTION_WITH_BACKGROUND_NAME = "content-background-connection";
const COMMAND_START_RECORDING = "start-recording";
const COMMAND_STOP_RECORDING = "stop-recording";
const COMMAND_AUDIO_DATA = "audio-data";

let mediaRecorder = null;
let audioChunks = [];
let port = null;

function startRecording() {
	navigator.mediaDevices
		.getUserMedia({ audio: true })
		.then((stream) => {
			mediaRecorder = new MediaRecorder(stream);
			audioChunks = [];

			mediaRecorder.ondataavailable = (event) => {
				audioChunks.push(event.data);
			};

			mediaRecorder.onstop = () => {
				const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
				sendAudioBlobToBackground(audioBlob);
			};

			mediaRecorder.start();
			console.log(`${PAGE_NAME}: Recording started.`);
		})
		.catch((error) => {
			console.error(`${PAGE_NAME}: Error accessing microphone:`, error);
			sendMessageToBackground("error", "Microphone access denied.");
		});
}

function stopRecording() {
	if (mediaRecorder && mediaRecorder.state !== "inactive") {
		mediaRecorder.stop();
		console.log(`${PAGE_NAME}: Recording stopped.`);
	}
}

function sendAudioBlobToBackground(blob) {
	const reader = new FileReader();
	reader.readAsDataURL(blob);
	reader.onloadend = () => {
		sendMessageToBackground(COMMAND_AUDIO_DATA, reader.result);
	};
}

function sendMessageToBackground(command, data) {
	port.postMessage({ command, data });
	console.log(`${PAGE_NAME}: Sent message - Command: ${command}`);
}

port = chrome.runtime.connect({ name: CONNECTION_WITH_BACKGROUND_NAME });
port.onMessage.addListener((message) => {
	if (message.command === COMMAND_START_RECORDING) {
		startRecording();
	} else if (message.command === COMMAND_STOP_RECORDING) {
		stopRecording();
	}
});
console.log(`${PAGE_NAME}: Content script loaded and listening.`);
