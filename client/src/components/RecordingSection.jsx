import { Mic, MicOff, Clock, Monitor, Headphones } from 'lucide-react';

const RecordingSection = ({ 
  isListening, 
  toggleListening, 
  recordingTime, 
  formatTime, 
  recordingMode 
}) => {
  const getRecordingIcon = () => {
    if (isListening) {
      return <MicOff size={32} />;
    }
    
    switch (recordingMode) {
      case 'microphone':
        return <Mic size={32} />;
      case 'system':
        return <Monitor size={32} />;
      case 'both':
        return <Headphones size={32} />;
      default:
        return <Mic size={32} />;
    }
  };

  const getRecordingLabel = () => {
    switch (recordingMode) {
      case 'microphone':
        return 'Microphone Recording';
      case 'system':
        return 'System Audio Recording';
      case 'both':
        return 'Multi-Source Recording';
      default:
        return 'Audio Recording';
    }
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={toggleListening}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-green-500 hover:bg-green-600'
          } text-white shadow-lg hover:shadow-xl`}
        >
          {getRecordingIcon()}
        </button>
        
        {isListening && (
          <div className="text-center text-white">
            <div className="flex items-center justify-center mb-2">
              <Clock size={16} className="mr-2" />
              <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
            </div>
            <div className="text-sm opacity-80">
              {recordingMode === 'system' && 'Recording system audio...'}
              {recordingMode === 'microphone' && 'Recording microphone...'}
              {recordingMode === 'both' && 'Recording all audio sources...'}
            </div>
          </div>
        )}

        {recordingMode === 'system' && !isListening && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-center">
            <p className="text-yellow-300 text-xs">
              ⚠️ System audio recording requires screen share permission.
              You'll be prompted to select an audio source when you start recording.
            </p>
          </div>
        )}

        {recordingMode === 'both' && !isListening && (
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 text-center">
            <p className="text-blue-300 text-xs">
              🎧 Multi-source mode will record both your microphone and system audio.
              You'll need to grant both microphone and screen share permissions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingSection;