import React, { useState } from 'react';
import Papa from 'papaparse'; 
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css'; 
import { MdDelete } from "react-icons/md";
const DispatchMails = () => {
  const [mails, setMails] = useState([]);
  const [newMail, setNewMail] = useState('');
  const [summaryPdf, setSummaryPdf] = useState(null); 
  const [csvFile, setCsvFile] = useState(null); 
  const [subject, setSubject] = useState(''); 
  const [isSending, setIsSending] = useState(false); 

  const handleAddMail = () => {
    if (newMail.trim() !== '' && validateEmail(newMail)) {
      setMails([...mails, newMail]); 
      setNewMail(''); 
    } else {
      toast.error('Please enter a valid email address.');
    }
  };
  
  const handleDeleteMail = (index) => {
    const updatedMails = mails.filter((_, i) => i !== index);
    setMails(updatedMails); 
  };

  const handleClearAll = () => {
    setMails([]);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0]; 
    if (file) {
      setCsvFile(file); 
      Papa.parse(file, {
        header: true, 
        dynamicTyping: true,
        complete: (results) => {
          const emails = results.data.map((row) => row.mail).filter(Boolean); 
          setMails((prevMails) => [...prevMails, ...emails]); 
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          toast.error('Error parsing CSV file. Please check the file format.');
        },
      });
    }
  };

  const handleSummaryPdfUpload = (event) => {
    const file = event.target.files[0]; 
    if (file) {
      setSummaryPdf(file); 
    }
  };

  const handleUnselectCsv = () => {
    setCsvFile(null);
    setMails([]); 
  };

  const handleUnselectPdf = () => {
    setSummaryPdf(null); 
  };

  const handleSubmit = async () => {
    if (!subject.trim() || mails.length === 0 || !summaryPdf) {
      toast.error('Please fill all fields before submitting.');
      return;
    }

    setIsSending(true); 

    const formData = new FormData();
    formData.append('subject', subject); 
    formData.append('summaryPdf', summaryPdf); 
    formData.append('mails', JSON.stringify(mails));

    try {
      const response = await axios.post('http://localhost:5000/dispatch-mails', formData, {
        headers: {
          'Content-Type': 'multipart/form-data', 
        },
      });

      if (response.status === 200) {
        toast.success('Emails dispatched successfully!');
        console.log('Response:', response.data);
      } else {
        toast.error('Submission failed. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting data:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSending(false); 
    }
  };
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
    return regex.test(email);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">
          Dispatch Mails
        </h1>

        <div className="mb-8">
          <label className="block mb-3 text-lg font-medium text-gray-700">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter subject"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
            required
          />
        </div>

        <div className="flex gap-4 mb-8">
  <input
    type="email"
    value={newMail}
    onChange={(e) => setNewMail(e.target.value)}
    placeholder="Enter email"
    className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
    required
  />
  <button
    onClick={handleAddMail}
    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg"
  >
    Add
  </button>
</div>

        <div className="mb-8">
          <label className="block mb-3 text-lg font-medium text-gray-700">
            Upload CSV File (with "mail" column)
          </label>
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="opacity-0 absolute w-full h-full cursor-pointer"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="block w-full p-4 bg-blue-50 text-blue-700 rounded-lg border-2 border-dashed border-blue-200 hover:bg-blue-100 transition-all duration-200 cursor-pointer text-center"
            >
              <span className="text-lg font-semibold">Choose a CSV file</span>
              <span className="block text-sm text-blue-600 mt-1">
                or drag and drop it here
              </span>
            </label>
          </div>
          {csvFile && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex justify-between items-center">
              <span className="text-blue-700">Uploaded: {csvFile.name}</span>
              <button
                onClick={handleUnselectCsv}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
              >
                Unselect
              </button>
            </div>
          )}
        </div>

        <div className="mb-8">
          <label className="block mb-3 text-lg font-medium text-gray-700">
            Upload Summary PDF
          </label>
          <div className="relative">
            <input
              type="file"
              accept=".pdf"
              onChange={handleSummaryPdfUpload}
              className="opacity-0 absolute w-full h-full cursor-pointer"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className="block w-full p-4 bg-green-50 text-green-700 rounded-lg border-2 border-dashed border-green-200 hover:bg-green-100 transition-all duration-200 cursor-pointer text-center"
            >
              <span className="text-lg font-semibold">Choose a PDF file</span>
              <span className="block text-sm text-green-600 mt-1">
                or drag and drop it here
              </span>
            </label>
          </div>
          {summaryPdf && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg flex justify-between items-center">
              <span className="text-green-700">Uploaded: {summaryPdf.name}</span>
              <button
                onClick={handleUnselectPdf}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
              >
                Unselect
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3 mb-8">
          {mails.map((mail, index) => (
            <div
              key={index}
              className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 shadow-sm"
            >
              <span className="text-gray-700 font-medium">{mail}</span>
              <button
                onClick={() => handleDeleteMail(index)}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
              >
               <MdDelete />

              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleClearAll}
            disabled={mails.length === 0} 
            className="flex-1 px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
          <button
            onClick={handleSubmit}
            disabled={mails.length === 0 || !summaryPdf || !subject.trim() || isSending} 
            className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative"
          >
            {isSending ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-2 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2">Sending...</span>
              </div>
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DispatchMails;