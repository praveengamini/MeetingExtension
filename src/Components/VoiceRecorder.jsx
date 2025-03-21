import React, { useRef } from "react";
import { useState } from "react";
const VoiceRecorder = ({ audioURL, setAudioURL }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm;codecs=opus",
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl); // Update the parent's state
        audioChunksRef.current = [];
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Play recorded audio
  const playRecording = () => {
    if (audioURL) {
      const audio = new Audio(audioURL);
      audio.play();
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-700/30">
      <h1 className="text-4xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
        Voice Recorder
      </h1>

      {/* Recording Button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`w-full px-6 py-3 rounded-xl text-lg font-semibold transition-all duration-300 ${
          isRecording
            ? "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
            : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
        } text-white shadow-lg hover:shadow-xl active:scale-95`}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="mt-4 flex items-center justify-center">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
          <span className="ml-2 text-gray-300 font-medium">Recording...</span>
        </div>
      )}

      {/* Playback Section */}
      {audioURL && (
        <div className="mt-8">
          <button
            onClick={playRecording}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95"
          >
            Play Recording
          </button>

          {/* Audio Player */}
          <div className="mt-4">
            <audio
              controls
              src={audioURL}
              className="w-full rounded-lg bg-gray-700/50 border border-gray-600/30"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;