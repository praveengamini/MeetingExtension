// === Store and retrieve the popup window ID persistently ===
function getStoredWindowId(callback) {
  chrome.storage.local.get(['extensionWindowId'], (result) => {
    callback(result.extensionWindowId || null);
  });
}

function setStoredWindowId(id) {
  chrome.storage.local.set({ extensionWindowId: id });
}

function clearStoredWindowId() {
  chrome.storage.local.remove('extensionWindowId');
}

// === Open the React extension in a popup window ===
function openExtensionWindow() {
  chrome.windows.create({
    url: chrome.runtime.getURL("index.html"),
    type: "popup",
    width: 400,
    height: 600
  }, (newWindow) => {
    if (newWindow && newWindow.id !== undefined) {
      setStoredWindowId(newWindow.id);
    }
  });
}

// === Handle extension icon click ===
chrome.action.onClicked.addListener(() => {
  getStoredWindowId((windowId) => {
    if (windowId !== null) {
      chrome.windows.get(windowId, (win) => {
        if (chrome.runtime.lastError || !win) {
          // Window closed or invalid — open new
          openExtensionWindow();
        } else {
          // Window exists — bring to focus
          chrome.windows.update(windowId, { focused: true });
        }
      });
    } else {
      openExtensionWindow();
    }
  });
});

// === Handle manual window close to clean up ID ===
chrome.windows.onRemoved.addListener((closedWindowId) => {
  getStoredWindowId((storedId) => {
    if (storedId === closedWindowId) {
      clearStoredWindowId();
    }
  });
});

// === Initialize storage defaults on install ===
chrome.runtime.onInstalled.addListener(() => {
  console.log("Meeting Recorder Extension installed");

  chrome.storage.local.set({
    transcript: '',
    summary: '',
    emails: [],
    subject: 'Meeting Summary'
  });
});

// === Handle messages from the UI (React app) ===
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
          sendResponse({ success: true, downloadId });
        }
      });
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});
