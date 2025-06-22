import React from 'react';
import { Mail, Plus, Upload, X, Trash2 } from 'lucide-react';
import NotificationComponent from './NotificationComponent';

const EmailDispatchSection = ({
  subject,
  setSubject,
  emails,
  setEmails,
  newEmail,
  setNewEmail,
  csvFile,
  setCsvFile,
  isSending,
  setIsSending,
  summary,
  showNotification,
  setCurrentView,
  notification,
  setNotification
}) => {
  const backendUrl = "https://meetingextension.onrender.com";

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleAddEmail = () => {
    if (newEmail.trim() && validateEmail(newEmail)) {
      if (!emails.includes(newEmail)) {
        setEmails([...emails, newEmail]);
        setNewEmail('');
        showNotification('Email added successfully', 'success');
      } else {
        showNotification('Email already added', 'error');
      }
    } else {
      showNotification('Please enter a valid email address', 'error');
    }
  };

  const handleDeleteEmail = (index) => {
    setEmails(emails.filter((_, i) => i !== index));
    showNotification('Email removed', 'info');
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
            showNotification('CSV file is empty', 'error');
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
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
            showNotification(`Added ${newEmails.length} emails from CSV`, 'success');
          } else {
            showNotification('No email column found. Please ensure your CSV has a column named "email" or "mail"', 'error');
          }
        } catch (error) {
          console.error('Error parsing CSV:', error);
          showNotification('Error parsing CSV file. Please check the file format.', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  const sendEmails = async () => {
    if (!summary || emails.length === 0 || !subject.trim()) {
      showNotification('Please ensure you have a summary, subject, and at least one email address', 'error');
      return;
    }

    setIsSending(true);
    try {
      const pdfResponse = await fetch(`${backendUrl}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: summary }),
      });

      if (!pdfResponse.ok) {
        throw new Error(`Failed to generate PDF: ${pdfResponse.status}`);
      }

      const pdfBlob = await pdfResponse.blob();

      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('mails', JSON.stringify(emails));
      formData.append('summaryPdf', pdfBlob, `meeting-summary-${new Date().toISOString().split('T')[0]}.pdf`);

      const emailResponse = await fetch(`${backendUrl}/dispatch-mails`, {
        method: 'POST',
        body: formData,
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to send emails: ${emailResponse.status}`);
      }

      const result = await emailResponse.json();
      showNotification(`${result.message} Sent to ${emails.length} recipients!`, 'success');

      setEmails([]);
      setSubject('Meeting Summary');
      setCsvFile(null);
      setCurrentView('main');

    } catch (error) {
      console.error('Error sending emails:', error);
      showNotification(`Failed to send emails: ${error.message}. Make sure your backend server is running on ${backendUrl}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-96 h-[600px] bg-gradient-to-br from-blue-50 to-purple-50 p-4 overflow-y-auto relative">
      <NotificationComponent notification={notification} setNotification={setNotification} />

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
};

export default EmailDispatchSection;
