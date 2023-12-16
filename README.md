# Voice 2 Text Chrome Extension

The Voice 2 Text Chrome Extension is a robust and interactive tool designed to transcribe audio from the user's microphone input into text using OpenAI's API. This documentation covers its architecture, components, and functionality to provide a comprehensive understanding from the ground up.

## Prerequisites
Before installing the extension, ensure you have:

- Google Chrome browser installed.
- Access to the internet for downloading files and obtaining the OpenAI API key.

### Installation Steps
1. Download the Extension:
- Obtain the extension files (usually in a .zip format) from the provided source.
Extract the .zip file to a folder on your computer.
Load the Extension in Chrome:

2. Open Google Chrome.
- Go to chrome://extensions/ in your browser.
- Enable 'Developer Mode' at the top right corner of the page.
- Click on 'Load unpacked'.
- Navigate to the folder where you extracted the extension files and select it.

3. Verify Installation:
- Ensure the extension icon appears in the Chrome toolbar.
Click on the icon to open the popup and verify that the UI is displayed correctly.

## Overview

The extension comprises three main parts: 
1. **Background Script (`background.js`)**: Runs in the background and handles communication between the popup and the content script.
2. **Popup Script (`popup.js`)**: Manages user interactions from the browser toolbar.
3. **Content Script (`contentScript.js`)**: Interacts with the content of web pages and handles audio recording.

## Architecture

### 1. Background Script (`background.js`)

This script serves as a communication hub between the popup and content scripts. It uses Chrome’s runtime messaging API to listen for connections and messages.

- **Ports**: It maintains two ports, `popupPort` and `contentPort`, for connecting with the popup and content scripts, respectively.
- **Message Handling**: It listens for specific commands (like starting/stopping recording) from the popup and forwards them to the content script. It also receives audio data from the content script and sends it to the OpenAI API for transcription.
- **Transcription**: Processes audio data and sends it to OpenAI's API, then relays the transcription results back to the popup.

### 2. Popup Script (`popup.js`)

This script is triggered when the user clicks on the extension's toolbar icon. It provides a user interface for controlling the extension.

- **UI Controls**: Contains buttons for starting/stopping recording and copying the transcription text to the clipboard.
- **Runtime Messaging**: Connects to the background script via `chrome.runtime.connect` and sends commands based on user interactions.
- **Displaying Transcription**: Receives the transcribed text from the background script and displays it in the popup window.

### 3. Content Script (`contentScript.js`)

Injected into web pages, this script handles audio recording from the user’s microphone.

- **Audio Recording**: Uses the `MediaRecorder` API to capture audio.
- **Communication with Background**: Connects to the background script and listens for recording commands. Sends the recorded audio data back to the background script.

## Functionality Flow

1. **Starting the Extension**: When the user clicks the extension icon, `popup.js` is executed, displaying the UI for recording control.
2. **Starting Recording**: The user clicks "Start Recording" in the popup, which sends a command to `background.js`.
3. **Audio Capture**: `background.js` relays this command to `contentScript.js`, which starts recording audio from the user’s microphone.
4. **Stopping Recording**: The user clicks "Stop Recording". `popup.js` sends this command to `background.js`, which then instructs `contentScript.js` to stop recording.
5. **Processing Audio Data**: The recorded audio is sent from `contentScript.js` to `background.js`, which forwards it to the OpenAI API.
6. **Displaying Transcription**: Once the transcription is received from OpenAI, `background.js` sends it back to `popup.js`, where it is displayed to the user.
7. **Copying Text**: The user can copy the transcribed text to the clipboard using the provided button.

## Development and Debugging

- **Manifest File (`manifest.json`)**: Configures the extension, including scripts, permissions, and icons.
- **Testing**: Use Chrome’s Developer Tools for debugging (Inspect Popup, Inspect Background Page).
- **Error Handling**: Console logs and error handling are implemented for monitoring the extension's operations.

## Conclusion

The Voice 2 Text Chrome Extension is a sophisticated tool combining various Chrome extension APIs and external services like OpenAI's API to provide real-time audio transcription. Its modular architecture ensures efficient communication and processing, making it a practical utility for users needing quick and reliable voice-to-text conversion.
