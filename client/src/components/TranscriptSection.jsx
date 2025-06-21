import React from 'react';
import { FileText } from 'lucide-react';

const TranscriptSection = ({ transcript }) => {
  if (!transcript) return null;

  return (
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
  );
};

export default TranscriptSection;