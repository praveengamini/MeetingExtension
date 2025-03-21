let mediaRecorder;
let audioChunks = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_RECORDING') {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Save recording to local storage
        chrome.storage.local.get(['recordings'], (result) => {
          const recordings = result.recordings || [];
          recordings.push(audioUrl);
          chrome.storage.local.set({ recordings });
        });

        audioChunks = [];
      };
    });
  }

  if (message.type === 'STOP_RECORDING') {
    mediaRecorder.stop();
  }
});
