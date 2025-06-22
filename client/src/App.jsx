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
  const recognitionRef = useRef(null);
  const intervalRef = useRef(null);

  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [subject, setSubject] = useState('Meeting Summary');
  const [csvFile, setCsvFile] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const [backendUrl, setBackendUrl] = useState('http://localhost:5000');

  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

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
        setIsListening(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        let errorMessage = 'Speech recognition error occurred';
        switch(event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Audio capture failed. Check your microphone.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error occurred. Check your connection.';
            break;
        }
        showNotification(errorMessage, 'error');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['transcript', 'summary', 'emails', 'subject'], (result) => {
        if (result.transcript) setTranscript(result.transcript);
        if (result.summary) setSummary(result.summary);
        if (result.emails) setEmails(result.emails);
        if (result.subject) setSubject(result.subject);
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        transcript,
        summary,
        emails,
        subject
      });
    }
  }, [transcript, summary, emails, subject]);

  const toggleListening = async () => {
    try {
      if (!recognitionRef.current) {
        showNotification('Speech recognition not supported in this browser', 'error');
        return;
      }

      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      } else {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        recognitionRef.current.start();
        setIsListening(true);
        setRecordingTime(0);
        
        intervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      }
    } catch (error) {
      console.error('Microphone permission denied:', error);
      showNotification('Microphone access is required for recording. Please enable it in your browser settings.', 'error');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const clearAll = () => {
    setTranscript('');
    setSummary('');
    setRecordingTime(0);
    setEmails([]);
    setNewEmail('');
    setSubject('Meeting Summary');
    setCsvFile(null);
    setCurrentView('main');
    
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

        <RecordingSection
          isListening={isListening}
          toggleListening={toggleListening}
          recordingTime={recordingTime}
          formatTime={formatTime}
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