import express from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { CohereClient } from 'cohere-ai'; 

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY, 
});

app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.use(cors({
  origin: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));

const port = process.env.PORT || 5000;

if (!process.env.EMAIL || !process.env.EMAIL_PASSWORD) {
  console.warn('Warning: EMAIL and EMAIL_PASSWORD environment variables not set. Email functionality will not work.');
}

if (!process.env.COHERE_API_KEY) {
  console.warn('Warning: COHERE_API_KEY environment variable not set. AI summary functionality will not work.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

if (process.env.EMAIL && process.env.EMAIL_PASSWORD) {
  transporter.verify((error, success) => {
    if (error) {
      console.error('Email configuration error:', error);
    } else {
      console.log('Email server is ready to send messages');
    }
  });
}

app.post('/generate-pdf', async (req, res) => {
  console.log('Received PDF generation request');
  console.log('Request body:', req.body);
  
  try {
    const { content } = req.body;

    if (!content) {
      console.log('No content provided');
      return res.status(400).json({ error: 'Content is required' });
    }

    console.log('Generating PDF with content length:', content.length);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="meeting-summary.pdf"');

    const doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });

    doc.pipe(res);

    doc.fontSize(20)
       .text('Meeting Summary', { align: 'center' })
       .moveDown();

    doc.fontSize(12)
       .text(content, {
         align: 'left',
         lineGap: 5
       });

    doc.end();
    console.log('PDF generated successfully');

  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
  }
});

app.post('/dispatch-mails', upload.single('summaryPdf'), async (req, res) => {
  try {
    const { subject, mails } = req.body;
    const summaryPdf = req.file;

    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    if (!mails) {
      return res.status(400).json({ error: 'Email list is required' });
    }

    if (!summaryPdf) {
      return res.status(400).json({ error: 'PDF attachment is required' });
    }

    if (!process.env.EMAIL || !process.env.EMAIL_PASSWORD) {
      return res.status(500).json({ 
        error: 'Email configuration not set. Please configure EMAIL and EMAIL_PASSWORD environment variables.' 
      });
    }

    const emailList = JSON.parse(mails);
    
    if (!Array.isArray(emailList) || emailList.length === 0) {
      return res.status(400).json({ error: 'Valid email list is required' });
    }

    console.log(`Sending emails to ${emailList.length} recipients`);

    const emailPromises = emailList.map(async (email) => {
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: subject,
        html: `
          <h2>Meeting Summary</h2>
          <p>Please find the attached meeting summary PDF.</p>
          <p>This email was sent automatically by the Meeting Recorder extension.</p>
          <hr>
          <small>Generated on: ${new Date().toLocaleString()}</small>
        `,
        attachments: [
          {
            filename: summaryPdf.originalname || 'meeting-summary.pdf',
            content: summaryPdf.buffer,
            contentType: 'application/pdf'
          }
        ]
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${email}`);
        return { email, status: 'sent' };
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        return { email, status: 'failed', error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    if (successful === 0) {
      return res.status(500).json({ 
        error: 'Failed to send any emails',
        details: results 
      });
    }

    res.status(200).json({
      message: `Successfully sent ${successful} emails${failed > 0 ? ` (${failed} failed)` : ''}`,
      successful,
      failed,
      details: results
    });

  } catch (error) {
    console.error('Error in dispatch-mails:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
      details: error.message 
    });
  }
});

app.post('/generate-summary', async (req, res) => {
  try {
    const { transcript, duration } = req.body;

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Transcript is required and cannot be empty' 
      });
    }

    if (!process.env.COHERE_API_KEY) {
      return res.status(500).json({ 
        error: 'Cohere API key not configured. Please set COHERE_API_KEY environment variable.' 
      });
    }

    const prompt = `Please provide a comprehensive summary of the following meeting transcript. Include key points discussed, decisions made, action items, and any important details. Format the summary in a professional manner suitable for sharing with meeting participants.

Meeting Duration: ${duration || 'Not specified'}
Date: ${new Date().toLocaleDateString()}

Transcript:
${transcript}

Please structure your summary with the following sections:
1. Meeting Overview
2. Key Discussion Points
3. Decisions Made
4. Action Items (if any)
5. Next Steps (if mentioned)`;

    const response = await cohere.generate({
      model: 'command', 
      prompt: prompt,
      maxTokens: 1000, 
      temperature: 0.3,
      k: 0,
      stopSequences: [],
      returnLikelihoods: 'NONE'
    });

    if (!response.generations || response.generations.length === 0) {
      throw new Error('No summary generated from Cohere API');
    }

    const aiSummary = response.generations[0].text.trim();
    
    const formattedSummary = `AI-Generated Meeting Summary
Generated on: ${new Date().toLocaleString()}
Meeting Duration: ${duration || 'Not specified'}

${aiSummary}

---
Full Transcript:
${transcript}`;

    res.json({ 
      success: true,
      summary: formattedSummary,
      model_used: 'command',
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating summary with Cohere:', error);
    
    let errorMessage = 'Failed to generate summary';
    
    if (error.message?.includes('API key') || error.message?.includes('unauthorized')) {
      errorMessage = 'Invalid Cohere API key. Please check your configuration.';
    } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
      errorMessage = 'API quota exceeded. Please try again later.';
    } else if (error.message?.includes('network') || error.code === 'ECONNREFUSED') {
      errorMessage = 'Network error. Please check your internet connection.';
    }

    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


app.listen(port, () => {
  console.log(`Meeting Recorder API Server running on port ${port}`);

});