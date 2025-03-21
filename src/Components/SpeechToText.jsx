import React, { useState, useRef, useEffect } from 'react';

const SpeechToText = ({transcript, setTranscript}) => {
  const [isListening, setIsListening] = useState(false);

  // Use useRef to persist the SpeechRecognition instance
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize the SpeechRecognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    recognitionRef.current.continuous = false; // Stop after one sentence
    recognitionRef.current.interimResults = false; // Only final results
    recognitionRef.current.lang = 'en-US'; // Set language

    // Handle results
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setTranscript(transcript);
      setIsListening(false); // Stop listening after receiving the result
    };

    // Handle errors
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false); // Stop listening on error
    };

    // Cleanup on component unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle start/stop listening
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
  <div className="bg-gray-800/50 backdrop-blur-lg rounded-3xl shadow-2xl p-8 max-w-2xl w-full border border-gray-700/30">
    <h1 className="text-4xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
      Speech-to-Text in React
    </h1>

    <button
      onClick={toggleListening}
      className={`w-full py-3 rounded-xl text-lg font-medium transition duration-300 ${
        isListening
          ? "bg-red-500 hover:bg-red-600"
          : "bg-green-500 hover:bg-green-600"
      } text-white shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400`}
    >
      {isListening ? "Stop Listening" : "Start Listening"}
    </button>

    <div className="mt-6 p-4 bg-gray-700/30 rounded-lg text-gray-200 shadow-inner min-h-[150px] overflow-y-auto">
      <p className="text-lg leading-relaxed">
        {transcript || "Your transcribed text will appear here..."}
      </p>
    </div>
  </div>
</div>

  );
};

export default SpeechToText;