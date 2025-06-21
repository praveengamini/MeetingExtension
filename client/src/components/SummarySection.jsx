import React from 'react';
import { FileText, Download, Users, CheckCircle } from 'lucide-react';

const SummarySection = ({
  transcript,
  summary,
  setSummary,
  isGeneratingSummary,
  setIsGeneratingSummary,
  backendUrl,
  recordingTime,
  formatTime,
  showNotification,
  setCurrentView
}) => {
  const generateSummary = async () => {
    if (!transcript.trim()) {
      showNotification('No transcript available to summarize', 'error');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const response = await fetch(`${backendUrl}/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          transcript: transcript.trim(),
          duration: formatTime(recordingTime)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate summary: ${response.status}`);
      }

      const result = await response.json();
      setSummary(result.summary);
      showNotification('Summary generated successfully!', 'success');
      
    } catch (error) {
      console.error('Error generating summary:', error);
      showNotification(`Failed to generate summary: ${error.message}. Make sure your backend server is running on ${backendUrl}`, 'error');
      
      const sentences = transcript.split('. ').filter(s => s.trim().length > 10);
      const keyPoints = sentences.slice(0, Math.min(5, sentences.length));
      const fallbackSummary = `Meeting Summary (Basic)\n\nKey Points:\n${keyPoints.map((point, i) => `${i + 1}. ${point.trim()}.`).join('\n')}\n\nDuration: ${formatTime(recordingTime)}\nGenerated: ${new Date().toLocaleString()}\n\nFull Transcript:\n${transcript}`;
      setSummary(fallbackSummary);
      showNotification('Generated basic summary as fallback', 'info');
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
      
      if (typeof chrome !== 'undefined' && chrome.downloads) {
        chrome.downloads.download({
          url: url,
          filename: `meeting-summary-${new Date().toISOString().split('T')[0]}.pdf`
        });
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      URL.revokeObjectURL(url);
      showNotification('Summary downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showNotification(`Failed to download PDF: ${error.message}. Make sure your backend server is running on ${backendUrl}`, 'error');
    }
  };

  return (
    <>
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
                Generating AI Summary...
              </>
            ) : (
              <>
                <FileText size={16} className="mr-2" />
                Generate AI Summary
              </>
            )}
          </button>
        </div>
      )}

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
    </>
  );
};

export default SummarySection;