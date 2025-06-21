// Background script for Meeting Recorder Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("Meeting Recorder Extension installed");
  
  // Initialize storage with default values
  chrome.storage.local.set({
    transcript: '',
    summary: '',
    emails: [],
    subject: 'Meeting Summary'
  });
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open the popup (this is handled automatically by the manifest)
  console.log("Extension icon clicked");
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received:", request);
  
  switch (request.action) {
    case 'saveData':
      chrome.storage.local.set(request.data, () => {
        sendResponse({ success: true });
      });
      return true; // Keep message channel open for async response
      
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
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Handle download requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download') {
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
  }
});