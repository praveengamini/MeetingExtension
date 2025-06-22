let extensionWindowId = null;

// Called when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("Meeting Recorder Extension installed");

  // Set default storage values
  chrome.storage.local.set({
    transcript: '',
    summary: '',
    emails: [],
    subject: 'Meeting Summary'
  });
});

// Handle click on extension icon
chrome.action.onClicked.addListener(() => {
  if (extensionWindowId !== null) {
    chrome.windows.get(extensionWindowId, (win) => {
      if (chrome.runtime.lastError || !win) {
        // If the window doesn't exist anymore, open a new one
        openExtensionWindow();
      } else {
        // Window exists, just focus it
        chrome.windows.update(extensionWindowId, { focused: true });
      }
    });
  } else {
    openExtensionWindow();
  }
});

// Function to open popup window with extension UI
function openExtensionWindow() {
  chrome.windows.create({
    url: chrome.runtime.getURL("index.html"),
    type: "popup",
    width: 400,
    height: 600
  }, (newWindow) => {
    extensionWindowId = newWindow.id;
  });
}

// Reset the window ID if it gets closed
chrome.windows.onRemoved.addListener((closedWindowId) => {
  if (closedWindowId === extensionWindowId) {
    extensionWindowId = null;
  }
});

// Handle messages from UI (React popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received:", request);

  switch (request.action) {
    case 'saveData':
      chrome.storage.local.set(request.data, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'loadData':
      chrome.storage.local.get(request.keys, (result) => {
        sendResponse({ data: result });
      });
      return true;

    case 'clearData':
      chrome.storage.local.clear(() => {
        sendResponse({ success: true });
      });
      return true;

    case 'download':
      chrome.downloads.download({
        url: request.url,
        filename: request.filename
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId: downloadId });
        }
      });
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});
