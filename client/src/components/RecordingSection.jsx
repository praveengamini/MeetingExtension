import React from 'react';
import { Mic, MicOff, Clock } from 'lucide-react';

const RecordingSection = ({ isListening, toggleListening, recordingTime, formatTime }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-center mb-4">
        <button
          onClick={toggleListening}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-green-500 hover:bg-green-600'
          } text-white shadow-lg hover:shadow-xl`}
        >
          {isListening ? <MicOff size={32} /> : <Mic size={32} />}
        </button>
      </div>
      
      {isListening && (
        <div className="text-center text-white">
          <div className="flex items-center justify-center mb-2">
            <Clock size={16} className="mr-2" />
            <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
          </div>
          <div className="text-sm opacity-80">Recording in progress...</div>
        </div>
      )}
    </div>
  );
};

export default RecordingSection;