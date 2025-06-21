async function startRecording() {
  const response = await chrome.runtime.sendMessage({ action: 'startRecording' });
  if (response.success) {
    updateUI('recording');
  }
}