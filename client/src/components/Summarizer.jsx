import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const Summarizer = ({ text }) => {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate()
  const summarizeText = async () => {
    const apiUrl = 'https://api-inference.huggingface.co/models/facebook/bart-large-cnn';
    const apiKey = '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';
    setLoading(true); 
    try {
      const response = await axios.post(
        apiUrl,
        { inputs: text }, 
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setSummary(response.data[0].summary_text);  
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      setSummary("Failed to generate summary. Please try again."); 
    } finally {
      setLoading(false); 
    }
  };

  const downloadSummary = async () => {
    try {
      const res = await axios.post(
        'http://localhost:5000/generate-pdf',
        { content: summary }, 
        { responseType: 'blob' } 
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'summary.pdf'); 
      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading the summary:', error);
    }
  };

  return (
  <div>
     <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-6 text-blue-600">Text Summarizer</h1>
      <div className="flex justify-center">
        <button
          onClick={summarizeText}
          disabled={loading}
          className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ${
            loading ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg"
          }`}
        >
          {loading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin h-5 w-5 mr-3 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Summarizing...
            </span>
          ) : (
            "Summarize"
          )}
        </button>
      </div>

      {summary && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Summary</h2>
          <button
            onClick={downloadSummary}
            className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:shadow-lg"
          >
            Download Summary as PDF
          </button>
        </div>
      )}

      {!summary && (
        <p className="mt-6 text-center text-gray-500">
          Your summary will appear here...
        </p>
      )}
    </div>
    {summary && (
  <button
    onClick={() => navigate('/dispatch')}
    className="mt-8 w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-2xl transform active:scale-95"
  >
    Send Mails
  </button>
)}

  </div>
  );
};

export default Summarizer;