import React, { useState } from 'react';
import { FileText, Download, Users, CheckCircle, Settings } from 'lucide-react';

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
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('default');

  const summaryFormats = {
    default: [
      "1. Meeting Overview",
      "2. Key Discussion Points",
      "3. Decisions Made",
      "4. Action Items (if any)",
      "5. Next Steps (if mentioned)"
    ],
    technical: [
      "1. Technical Challenges Discussed",
      "2. Solutions Proposed",
      "3. Implementation Plan",
      "4. Follow-up Tasks"
    ],
    management: [
      "1. Meeting Objective",
      "2. Key Business Decisions",
      "3. Resource Allocations",
      "4. Team Responsibilities",
      "5. Deadlines"
    ]
  };

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
          duration: formatTime(recordingTime),
          summaryStructure: summaryFormats[selectedFormat],
          customPrompt: customPrompt.trim() || undefined
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
      showNotification(`Failed to generate summary: ${error.message}`, 'error');

      // fallback summary
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

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification('Summary downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showNotification(`Failed to download PDF: ${error.message}`, 'error');
    }
  };

  return (
    <>
      {transcript && (
        <div className="mb-6 space-y-4">
          {/* Summary Format Selector */}
         <div className="bg-white/10 p-3 rounded-lg">
        <label className="text-white text-sm font-medium  mb-2 flex items-center">
          <Settings size={14} className="mr-1" /> Summary Format
        </label>
        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
          className="w-full p-2 rounded-md 
                    bg-gray-800 text-white border border-gray-600 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 
                    hover:bg-gray-700 transition-colors"
        >
          <option value="default">Default (General)</option>
          <option value="technical">Technical Meeting</option>
          <option value="management">Management Review</option>
        </select>
      </div>


          {/* Custom Prompt */}
          <div className="bg-white/10 p-3 rounded-lg">
            <label className="text-white text-sm font-medium block mb-2">
              Custom Instructions (Optional)
            </label>
            <textarea
              rows="3"
              placeholder="E.g., Focus on product design discussion and final outcomes..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full p-2 rounded-md bg-white/20 text-white resize-none focus:outline-none"
            />
          </div>

          {/* Generate Button */}
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
