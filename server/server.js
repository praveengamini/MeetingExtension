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

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// CORS configuration for Chrome extension
app.use(cors({
  origin: true, // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

const port = process.env.PORT || 5000;

// Validate environment variables
if (!process.env.EMAIL || !process.env.EMAIL_PASSWORD) {
  console.warn('Warning: EMAIL and EMAIL_PASSWORD environment variables not set. Email functionality will not work.');
}

// Configure nodemailer transporter - FIXED: createTransport not createTransporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify email configuration on startup
if (process.env.EMAIL && process.env.EMAIL_PASSWORD) {
  transporter.verify((error, success) => {
    if (error) {
      console.error('Email configuration error:', error);
    } else {
      console.log('Email server is ready to send messages');
    }
  });
}

// Generate PDF endpoint
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

    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="meeting-summary.pdf"');

    // Create PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });

    // Pipe the PDF directly to the response
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20)
       .text('Meeting Summary', { align: 'center' })
       .moveDown();

    doc.fontSize(12)
       .text(content, {
         align: 'left',
         lineGap: 5
       });

    // Finalize the PDF
    doc.end();
    console.log('PDF generated successfully');

  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
  }
});

// Email dispatch endpoint
app.post('/dispatch-mails', upload.single('summaryPdf'), async (req, res) => {
  try {
    const { subject, mails } = req.body;
    const summaryPdf = req.file;

    // Validate required fields
    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    if (!mails) {
      return res.status(400).json({ error: 'Email list is required' });
    }

    if (!summaryPdf) {
      return res.status(400).json({ error: 'PDF attachment is required' });
    }

    // Check email configuration
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    emailConfigured: !!(process.env.EMAIL && process.env.EMAIL_PASSWORD)
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Meeting Recorder API Server',
    version: '1.0.0',
    endpoints: {
      '/health': 'GET - Health check',
      '/generate-pdf': 'POST - Generate PDF from content',
      '/dispatch-mails': 'POST - Send emails with PDF attachment'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(port, () => {
  console.log(`Meeting Recorder API Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  
  if (!process.env.EMAIL || !process.env.EMAIL_PASSWORD) {
    console.log('\n⚠️  Email functionality disabled - set EMAIL and EMAIL_PASSWORD environment variables to enable');
  }
});