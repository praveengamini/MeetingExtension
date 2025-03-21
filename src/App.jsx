import React, { useState } from "react";
import VoiceRecorder from "./Components/VoiceRecorder";
import SpeechToText from "./Components/SpeechToText";
import Summarizer from "./Components/Summarizer";

const App = () => {
  const [transcript, setTranscript] = useState('');

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
      {<SpeechToText  transcript={transcript} setTranscript={ setTranscript} />}
         <Summarizer text={transcript} />
    </div>
  );
};

export default App;