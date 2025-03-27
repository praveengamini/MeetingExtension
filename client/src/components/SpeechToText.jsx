import React, { useState, useRef, useEffect } from 'react';
import Summarizer from './Summarizer';

const SpeechToText = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone permission granted");
    } catch (error) {
      console.error("Microphone permission denied", error);
    }
  };
  
  useEffect(() => {
    requestMicrophonePermission();
  }, []);
  

  useEffect(() => {
    requestMicrophonePermission(); 

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setTranscript(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        alert(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone permission granted");
  
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        recognitionRef.current.start();
        setIsListening(true);
      }
    } catch (error) {
      console.error("Microphone permission denied", error);
      alert("Microphone access denied. Please enable it in your browser settings.");
    }
  };
  

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-2 flex-col gap-9">
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-3xl shadow-2xl p-8 max-w-xl w-full border border-gray-700/30">
        <h1 className="text-4xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
          Smart Meeting Summaries
        </h1>

        <button
          onClick={toggleListening}
          className={`w-full py-3 rounded-xl text-xl font-medium transition duration-300 ${
            isListening
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
          } text-white shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400`}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
      </div>
      {transcript && <Summarizer text={transcript} />}
    </div>
  );
};

export default SpeechToText;
