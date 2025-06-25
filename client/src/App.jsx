import React, { useState, useRef, useEffect } from 'react';
import RecordingSection from './components/RecordingSection';
import TranscriptSection from './components/TranscriptSection';
import SummarySection from './components/SummarySection';
import EmailDispatchSection from './components/EmailDispatchSection';
import NotificationComponent from './components/NotificationComponent';

const App = () => {
  const [currentView, setCurrentView] = useState('main');
  
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingMode, setRecordingMode] = useState('microphone'); // 'microphone', 'system', 'both'
  
  const recognitionRef = useRef(null);
  const intervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const micStreamRef = useRef(null);
  const systemStreamRef = useRef(null);
  const audioUrlsRef = useRef([]);
  const finalRecordingTimeRef = useRef(0);

  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [subject, setSubject] = useState('Meeting Summary');
  const [csvFile, setCsvFile] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const [backendUrl, setBackendUrl] = useState('http://localhost:5000');

  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [deepgramApiKey, setDeepgramApiKey] = useState('');

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'info' });
    }, 4000);
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'aborted' || event.error === 'not-allowed') {
          setIsListening(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
        
        handleRecordingError(event.error);
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        
        if (isListening && (recordingMode === 'microphone' || recordingMode === 'both')) {
          setTimeout(() => {
            if (isListening && recognitionRef.current) {
              try {
                recognitionRef.current.start();
                console.log('Speech recognition restarted');
              } catch (error) {
                console.error('Failed to restart speech recognition:', error);
                stopRecording();
              }
            }
          }, 100);
        }
      };

      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
      };
    }

    // Load saved data
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([
        'transcript', 'summary', 'emails', 'subject', 'recordingMode', 
        'deepgramApiKey'
      ], (result) => {
        if (result.transcript) setTranscript(result.transcript);
        if (result.summary) setSummary(result.summary);
        if (result.emails) setEmails(result.emails);
        if (result.subject) setSubject(result.subject);
        if (result.recordingMode) setRecordingMode(result.recordingMode);
        if (result.deepgramApiKey) setDeepgramApiKey(result.deepgramApiKey);
      });
    }

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        transcript,
        summary,
        emails,
        subject,
        recordingMode,
        deepgramApiKey
      });
    }
  }, [transcript, summary, emails, subject, recordingMode, deepgramApiKey]);

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach(track => track.stop());
    }
    // Clean up audio URLs
    audioUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    audioUrlsRef.current = [];
  };

  const handleRecordingError = (errorType) => {
    setIsListening(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    let errorMessage = 'Recording error occurred';
    switch(errorType) {
      case 'no-speech':
        errorMessage = 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        errorMessage = 'Audio capture failed. Check your microphone.';
        break;
      case 'not-allowed':
        errorMessage = 'Audio access denied. Please allow audio access.';
        break;
      case 'network':
        errorMessage = 'Network error occurred. Check your connection.';
        break;
      default:
        errorMessage = `Recording error: ${errorType}`;
    }
    showNotification(errorMessage, 'error');
  };

  const getMicrophoneStream = async () => {
    try {
      return await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 
        } 
      });
    } catch (error) {
      throw new Error('Microphone access denied');
    }
  };

  const getSystemAudioStream = async () => {
    try {
      console.log('Requesting system audio stream...');
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { max: 1 },
          height: { max: 1 },
          frameRate: { max: 1 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimal for speech recognition
        }
      });

      console.log('Display media stream obtained:', stream);
      
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getVideoTracks().forEach(track => track.stop());
        throw new Error('No audio track available. Please select a tab or window with audio and check "Share audio" option.');
      }

      console.log('Audio tracks found:', audioTracks.length);
      
      const audioOnlyStream = new MediaStream();
      audioTracks.forEach(track => {
        audioOnlyStream.addTrack(track);
      });

      stream.getVideoTracks().forEach(track => track.stop());

      return audioOnlyStream;
      
    } catch (error) {
      console.error('getDisplayMedia error details:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Permission denied. Please allow screen sharing and make sure to check "Share audio" option.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No audio source found. Please select a browser tab (not entire screen) and check "Share audio".');
      } else if (error.name === 'AbortError') {
        throw new Error('Screen sharing was cancelled. Please try again and select "Share audio".');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('System audio capture not supported in this browser. Try using Chrome or Edge.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Audio source is not accessible. Try selecting a different tab or window.');
      } else {
        throw new Error(`System audio error: ${error.message}`);
      }
    }
  };

  const combineAudioStreams = (streams) => {
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    streams.forEach(stream => {
      if (stream && stream.getAudioTracks().length > 0) {
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(destination);
      }
    });

    return destination.stream;
  };

  const setupAudioRecording = (stream) => {
    audioChunksRef.current = [];
    
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];
    
    const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
    
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorderRef.current.mimeType 
        });
        
        processAudioBlob(audioBlob);
      }
    };

    mediaRecorderRef.current.start(1000);
  };

  const transcribeWithDeepgram = async (audioBlob) => {
    if (!deepgramApiKey) {
      throw new Error('Deepgram API key required. Please set it in the configuration.');
    }

    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'audio/webm',
      },
      body: audioBlob,
    });

    if (!response.ok) {
      throw new Error(`Deepgram API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  };

  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    showNotification('Transcribing audio with Deepgram...', 'info');
    
    try {
      const transcriptionText = await transcribeWithDeepgram(audioBlob);
      return transcriptionText;
      
    } catch (error) {
      console.error('Transcription failed:', error);
      showNotification(`Transcription failed: ${error.message}`, 'error');
      return '';
    } finally {
      setIsTranscribing(false);
    }
  };

  const processAudioBlob = async (audioBlob) => {
    try {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlsRef.current.push(audioUrl);
      
      const audioSizeKB = Math.round(audioBlob.size / 1024);
      const recordingDuration = finalRecordingTimeRef.current;
      
      console.log('Audio recorded:', audioBlob.size, 'bytes');
      
      // Transcribe system audio or both modes
      if (recordingMode === 'system' || recordingMode === 'both') {
        const timestamp = new Date().toLocaleTimeString();
        
        // Transcribe the audio
        const transcriptionText = await transcribeAudio(audioBlob);
        
        let audioInfo = `\n\n--- SYSTEM AUDIO RECORDED ---
📅 Time: ${timestamp}
⏱️ Duration: ${formatTime(recordingDuration)}
📊 Size: ${audioSizeKB}KB
🎵 Format: ${audioBlob.type}
💾 Status: Audio file ready for download
${recordingMode === 'both' ? '🎤 Note: Microphone audio transcribed above' : ''}`;

        if (transcriptionText) {
          audioInfo += `\n\n📝 TRANSCRIPTION:\n${transcriptionText}`;
          showNotification(`Audio transcribed successfully (${audioSizeKB}KB)`, 'success');
        } else {
          audioInfo += '\n\n❌ Transcription failed or empty';
        }
        
        audioInfo += '\n--- END RECORDING ---\n\n';
        
        setTranscript(prev => prev + audioInfo);
      } else {
        // Original behavior for microphone-only mode
        const timestamp = new Date().toLocaleTimeString();
        const audioInfo = `\n\n--- AUDIO RECORDED ---
📅 Time: ${timestamp}
⏱️ Duration: ${formatTime(recordingDuration)}
📊 Size: ${audioSizeKB}KB
💾 Status: Audio file ready for download
--- END RECORDING ---\n\n`;
        
        setTranscript(prev => prev + audioInfo);
        showNotification(`Audio recorded (${audioSizeKB}KB, ${formatTime(recordingDuration)})`, 'success');
      }
      
    } catch (error) {
      console.error('Audio processing error:', error);
      showNotification('Audio processing error', 'error');
    }
  };

  const startRecording = async () => {
    try {
      const streams = [];
      
      if (recordingMode === 'microphone' || recordingMode === 'both') {
        micStreamRef.current = await getMicrophoneStream();
        streams.push(micStreamRef.current);
        
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
            setTimeout(() => {
              if (recognitionRef.current) {
                recognitionRef.current.start();
              }
            }, 200);
          } catch (error) {
            try {
              recognitionRef.current.start();
            } catch (startError) {
              console.error('Could not start speech recognition:', startError);
            }
          }
        }
      }

      if (recordingMode === 'system' || recordingMode === 'both') {
        systemStreamRef.current = await getSystemAudioStream();
        streams.push(systemStreamRef.current);

        systemStreamRef.current.getTracks().forEach(track => {
          track.onended = () => {
            showNotification('Screen sharing stopped. Recording ended.', 'warning');
            stopRecording();
          };
        });
      }

      if (streams.length > 1) {
        streamRef.current = combineAudioStreams(streams);
      } else if (streams.length === 1) {
        streamRef.current = streams[0];
      }

      if (recordingMode === 'system' || recordingMode === 'both') {
        setupAudioRecording(streamRef.current);
      }

      setIsListening(true);
      setRecordingTime(0);
      
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      showNotification(`Recording started (${recordingMode} mode)`, 'success');

    } catch (error) {
      console.error('Recording start error:', error);
      handleRecordingError(error.message);
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording...');
    
    finalRecordingTimeRef.current = recordingTime;
    
    setIsListening(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach(track => track.stop());
    }

    showNotification('Recording stopped', 'info');
  };

  const toggleListening = async () => {
    if (isListening) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const clearAll = () => {
    stopRecording();
    setTranscript('');
    setSummary('');
    setRecordingTime(0);
    finalRecordingTimeRef.current = 0;
    setEmails([]);
    setNewEmail('');
    setSubject('Meeting Summary');
    setCsvFile(null);
    setCurrentView('main');
    
    audioUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    audioUrlsRef.current = [];
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.clear();
    }
    
    showNotification('All data cleared', 'info');
  };

  if (currentView === 'dispatch') {
    return (
      <EmailDispatchSection
        backendUrl={backendUrl}
        setBackendUrl={setBackendUrl}
        subject={subject}
        setSubject={setSubject}
        emails={emails}
        setEmails={setEmails}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        csvFile={csvFile}
        setCsvFile={setCsvFile}
        isSending={isSending}
        setIsSending={setIsSending}
        summary={summary}
        showNotification={showNotification}
        setCurrentView={setCurrentView}
        notification={notification}
        setNotification={setNotification}
      />
    );
  }

  return (
    <div className="w-96 h-[600px] bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4 overflow-y-auto relative">
      <NotificationComponent 
        notification={notification} 
        setNotification={setNotification} 
      />
      
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
        <h1 className="text-2xl font-bold mb-6 text-center text-white">
          Meeting Recorder
        </h1>

        <div className="mb-4">
          <label className="block text-white text-sm font-medium mb-2">
            Recording Mode
          </label>
          <select
            value={recordingMode}
            onChange={(e) => setRecordingMode(e.target.value)}
            disabled={isListening}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="microphone" className="bg-gray-800">Microphone Only</option>
            <option value="system" className="bg-gray-800">System Audio Only</option>
            <option value="both" className="bg-gray-800">Both (Microphone + System)</option>
          </select>
          <p className="text-xs text-gray-300 mt-1">
            {recordingMode === 'microphone' && 'Records your voice through microphone with speech-to-text'}
            {recordingMode === 'system' && 'Records system audio with Deepgram transcription'}
            {recordingMode === 'both' && 'Records both your voice and system audio'}
          </p>
        </div>

        {(recordingMode === 'system' || recordingMode === 'both') && (
          <div className="mb-4">
            <label className="block text-white text-sm font-medium mb-2">
              Deepgram API Key
            </label>
            <input
              type="password"
              placeholder="Enter your Deepgram API Key"
              value={deepgramApiKey}
              onChange={(e) => setDeepgramApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-gray-300 mt-1">
              Required for system audio transcription. Get your API key from Deepgram Console.
            </p>

            {isTranscribing && (
              <div className="text-xs text-yellow-300 mt-2 flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-300 mr-2"></div>
                Transcribing audio with Deepgram...
              </div>
            )}
          </div>
        )}

        <RecordingSection
          isListening={isListening}
          toggleListening={toggleListening}
          recordingTime={recordingTime}
          formatTime={formatTime}
          recordingMode={recordingMode}
        />

        <TranscriptSection transcript={transcript} setTranscript={setTranscript}/>

        <SummarySection
          transcript={transcript}
          summary={summary}
          setSummary={setSummary}
          isGeneratingSummary={isGeneratingSummary}
          setIsGeneratingSummary={setIsGeneratingSummary}
          backendUrl={backendUrl}
          recordingTime={recordingTime}
          formatTime={formatTime}
          showNotification={showNotification}
          setCurrentView={setCurrentView}
        />

        {(transcript || summary || emails.length > 0) && (
          <button
            onClick={clearAll}
            className="w-full mt-4 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};

export default App;