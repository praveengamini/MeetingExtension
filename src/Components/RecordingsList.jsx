import { useEffect, useState } from 'react';

const RecordingsList = () => {
  const [recordings, setRecordings] = useState([]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['recordings'], (result) => {
        if (result.recordings) {
          setRecordings(result.recordings);
        }
      });
    }
  }, []);
  

  const deleteRecording = (index) => {
    const updatedRecordings = recordings.filter((_, i) => i !== index);
    setRecordings(updatedRecordings);
    chrome.storage.local.set({ recordings: updatedRecordings });
  };

  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-2">Recordings:</h3>
      {recordings.map((url, index) => (
        <div key={index} className="flex items-center gap-2 mb-2">
          <audio controls src={url} className="w-full"></audio>
          <button
            onClick={() => deleteRecording(index)}
            className="bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
};

export default RecordingsList;
