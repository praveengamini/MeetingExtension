const startRecording = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.error('Speech Recognition is not supported in this browser');
    alert('Speech Recognition is not supported in this browser');
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    console.log('Speech recognition started');
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    if (event.error === 'no-speech') {
      alert('No speech detected. Please try again.');
    }
  };

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    console.log('Recognized text:', transcript);
  };

  recognition.start();
};
