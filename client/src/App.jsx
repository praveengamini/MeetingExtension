import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Download, Mail, Plus, Trash2, Upload, X, FileText, Users, Clock, CheckCircle } from 'lucide-react';

const App = () => {
  // Main app state
  const [currentView, setCurrentView] = useState('main');
  
  // Speech to text state
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recognitionRef = useRef(null);
  const intervalRef = useRef(null);

  // Summary state
  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Email dispatch state
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [subject, setSubject] = useState('Meeting Summary');
  const [csvFile, setCsvFile] = useState(null);
  const [isSending, setIsSending] = useState(false);

  // Backend URL - make configurable for different environments
  const [backendUrl, setBackendUrl] = useState('http://localhost:5000');

  // Initialize speech recognition
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
        
        // Show user-friendly error messages
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
        alert(errorMessage);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }

    // Load saved data from Chrome storage
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

  // Save data to Chrome storage whenever state changes
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
        alert('Speech recognition not supported in this browser');
        return;
      }

      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      } else {
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        recognitionRef.current.start();
        setIsListening(true);
        setRecordingTime(0);
        
        // Start timer
        intervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      }
    } catch (error) {
      console.error('Microphone permission denied:', error);
      alert('Microphone access is required for recording. Please enable it in your browser settings.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateSummary = async () => {
    if (!transcript.trim()) {
      alert('No transcript available to summarize');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      // Create a formatted summary from transcript
      const sentences = transcript.split('. ').filter(s => s.trim().length > 10);
      const keyPoints = sentences.slice(0, Math.min(5, sentences.length));
      const formattedSummary = `Meeting Summary\n\nKey Points:\n${keyPoints.map((point, i) => `${i + 1}. ${point.trim()}.`).join('\n')}\n\nDuration: ${formatTime(recordingTime)}\nGenerated: ${new Date().toLocaleString()}\n\nFull Transcript:\n${transcript}`;
      
      setSummary(formattedSummary);
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Failed to generate summary. Please try again.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const downloadSummary = async () => {
    if (!summary) return;
    
    try {
      const response = await fetch(`${backendUrl}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: summary }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Use Chrome downloads API if available
      if (typeof chrome !== 'undefined' && chrome.downloads) {
        chrome.downloads.download({
          url: url,
          filename: `meeting-summary-${new Date().toISOString().split('T')[0]}.pdf`
        });
      } else {
        // Fallback to regular download
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert(`Failed to download PDF: ${error.message}. Make sure your backend server is running on ${backendUrl}`);
    }
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleAddEmail = () => {
    if (newEmail.trim() && validateEmail(newEmail)) {
      if (!emails.includes(newEmail)) {
        setEmails([...emails, newEmail]);
        setNewEmail('');
      } else {
        alert('Email already added');
      }
    } else {
      alert('Please enter a valid email address');
    }
  };

  const handleDeleteEmail = (index) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            alert('CSV file is empty');
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          // Find email column (look for 'email', 'mail', 'e-mail', etc.)
          const emailColumn = headers.findIndex(header => 
            header.includes('email') || header.includes('mail') || header === 'e-mail'
          );
          
          if (emailColumn !== -1) {
            const newEmails = lines.slice(1)
              .map(line => {
                const columns = line.split(',');
                return columns[emailColumn] ? columns[emailColumn].trim() : null;
              })
              .filter(email => email && validateEmail(email));
            
            setEmails(prev => [...new Set([...prev, ...newEmails])]);
            alert(`Added ${newEmails.length} emails from CSV`);
          } else {
            alert('No email column found. Please ensure your CSV has a column named "email" or "mail"');
          }
        } catch (error) {
          console.error('Error parsing CSV:', error);
          alert('Error parsing CSV file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const sendEmails = async () => {
    if (!summary || emails.length === 0 || !subject.trim()) {
      alert('Please ensure you have a summary, subject, and at least one email address');
      return;
    }

    setIsSending(true);
    try {
      // First, generate PDF from summary
      const pdfResponse = await fetch(`${backendUrl}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: summary }),
      });

      if (!pdfResponse.ok) {
        throw new Error(`Failed to generate PDF: ${pdfResponse.status}`);
      }

      const pdfBlob = await pdfResponse.blob();
      
      // Create FormData for the dispatch-mails endpoint
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('mails', JSON.stringify(emails));
      formData.append('summaryPdf', pdfBlob, `meeting-summary-${new Date().toISOString().split('T')[0]}.pdf`);

      // Send emails with PDF attachment
      const emailResponse = await fetch(`${backendUrl}/dispatch-mails`, {
        method: 'POST',
        body: formData,
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to send emails: ${emailResponse.status}`);
      }

      const result = await emailResponse.json();
      alert(`${result.message} Sent to ${emails.length} recipients!`);
      
      // Reset form
      setEmails([]);
      setSubject('Meeting Summary');
      setCsvFile(null);
      setCurrentView('main');
      
    } catch (error) {
      console.error('Error sending emails:', error);
      alert(`Failed to send emails: ${error.message}. Make sure your backend server is running on ${backendUrl}`);
    } finally {
      setIsSending(false);
    }
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
    
    // Clear Chrome storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.clear();
    }
  };

  if (currentView === 'dispatch') {
    return (
      <div className="w-96 h-[600px] bg-gradient-to-br from-blue-50 to-purple-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <Mail className="mr-2 text-blue-600" size={24} />
              Send Summary
            </h2>
            <button
              onClick={() => setCurrentView('main')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Backend URL Configuration */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backend URL
            </label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="http://localhost:5000"
            />
          </div>

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email subject"
            />
          </div>

          {/* Add Email */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Recipients
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email address"
              />
              <button
                onClick={handleAddEmail}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* CSV Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV
            </label>
            <label className="block w-full p-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
              <div className="text-center">
                <Upload className="mx-auto mb-2" size={20} />
                <span className="text-sm text-gray-600">
                  Choose CSV file with emails
                </span>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </label>
            {csvFile && (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
                <span className="text-sm text-blue-700">{csvFile.name}</span>
                <button
                  onClick={() => setCsvFile(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Email List */}
          {emails.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipients ({emails.length})
              </label>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {emails.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 truncate">{email}</span>
                    <button
                      onClick={() => handleDeleteEmail(index)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setEmails([])}
              disabled={emails.length === 0}
              className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={sendEmails}
              disabled={!summary || emails.length === 0 || !subject.trim() || isSending}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Mail size={16} className="mr-2" />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 h-[600px] bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4 overflow-y-auto">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
        <h1 className="text-2xl font-bold mb-6 text-center text-white">
          Meeting Recorder
        </h1>

        {/* Recording Section */}
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

        {/* Transcript Section */}
        {transcript && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <FileText size={18} className="mr-2" />
              Transcript
            </h3>
            <div className="bg-white/20 rounded-lg p-4 max-h-32 overflow-y-auto">
              <p className="text-white text-sm leading-relaxed">
                {transcript.trim() || 'No transcript yet...'}
              </p>
            </div>
          </div>
        )}

        {/* Summary Section */}
        {transcript && (
          <div className="mb-6">
            <button
              onClick={generateSummary}
              disabled={isGeneratingSummary || !transcript.trim()}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isGeneratingSummary ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Generating Summary...
                </>
              ) : (
                <>
                  <FileText size={16} className="mr-2" />
                  Generate Summary
                </>
              )}
            </button>
          </div>
        )}

        {/* Summary Display */}
        {summary && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <CheckCircle size={18} className="mr-2 text-green-400" />
              Summary Ready
            </h3>
            <div className="bg-white/20 rounded-lg p-4 max-h-32 overflow-y-auto">
              <p className="text-white text-sm leading-relaxed whitespace-pre-line">
                {summary}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {summary && (
          <div className="space-y-3">
            <button
              onClick={downloadSummary}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
            >
              <Download size={16} className="mr-2" />
              Download Summary
            </button>
            
            <button
              onClick={() => setCurrentView('dispatch')}
              className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-300 flex items-center justify-center"
            >
              <Users size={16} className="mr-2" />
              Send to Participants
            </button>
          </div>
        )}

        {/* Clear All */}
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