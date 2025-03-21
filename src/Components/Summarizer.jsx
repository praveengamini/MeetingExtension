import { useState } from "react";

const Summarizer = ({ text }) => {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);


  const summarizeText = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer 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`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: text }),
        }
      );
      
      const data = await response.json();
      if (data[0]?.summary_text) {
        setSummary(data[0].summary_text);
      } else {
        throw new Error("Failed to summarize");
      }
    } catch (error) {
      console.error("Error:", error);
      setSummary("Failed to generate summary.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={summarizeText}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
      >
        {loading ? "Summarizing..." : "Summarize"}
      </button>
      <p className="mt-4">{summary || "Your summary will appear here..."}</p>
    </div>
  );
};

export default Summarizer;
