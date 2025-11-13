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
      margin: 60,
      size: 'A4',
      bufferPages: true
    });

    doc.pipe(res);

    // Define colors
    const primaryColor = '#2C3E50';
    const accentColor = '#3498DB';
    const lightGray = '#95A5A6';
    const darkGray = '#34495E';

    // Header with background
    doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);
    
    // Title
    doc.fillColor('#FFFFFF')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('Meeting Summary', 60, 35, { align: 'center' });
    
    // Date and time
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#ECF0F1')
       .text(`Generated on ${new Date().toLocaleString('en-US', {
         weekday: 'long',
         year: 'numeric',
         month: 'long',
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
       })}`, 60, 65, { align: 'center' });

    // Reset position after header
    doc.y = 130;

    // Parse content into sections
    const lines = content.split('\n');
    let currentSection = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        doc.moveDown(0.5);
        continue;
      }

      // Check if new page is needed
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
        doc.y = 60;
      }

      // Detect headers (lines ending with colon or starting with numbers/bullets)
      const isHeader = /^(AI-Generated Meeting Summary|Generated on:|Meeting Duration:|Full Transcript:|---|\d+\.|•|[A-Z][^:]{2,50}:)/.test(line);
      const isSectionTitle = /^[A-Z][a-zA-Z\s]{3,50}:$/.test(line) || 
                            /^\d+\.\s+[A-Z]/.test(line);
      const isDivider = line === '---' || line === '---' || /^-{3,}$/.test(line);

      if (isDivider) {
        // Draw a horizontal line
        doc.moveDown(0.5);
        doc.strokeColor(lightGray)
           .lineWidth(1)
           .moveTo(60, doc.y)
           .lineTo(doc.page.width - 60, doc.y)
           .stroke();
        doc.moveDown(0.5);
      } else if (isSectionTitle) {
        // Section headers
        doc.moveDown(0.8);
        doc.fillColor(accentColor)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text(line, {
             align: 'left',
             lineGap: 3
           });
        doc.moveDown(0.3);
      } else if (line.startsWith('Generated on:') || line.startsWith('Meeting Duration:')) {
        // Metadata lines
        doc.fillColor(darkGray)
           .fontSize(10)
           .font('Helvetica-Oblique')
           .text(line, {
             align: 'left',
             lineGap: 2
           });
      } else if (/^[-•]\s/.test(line)) {
        // Bullet points
        const bulletText = line.replace(/^[-•]\s/, '');
        doc.fillColor(primaryColor)
           .fontSize(11)
           .font('Helvetica')
           .text('• ', doc.x, doc.y, { continued: true })
           .text(bulletText, {
             align: 'left',
             lineGap: 4,
             indent: 15
           });
        doc.moveDown(0.2);
      } else if (/^\d+\.\s/.test(line)) {
        // Numbered items (action items, etc.)
        doc.fillColor(primaryColor)
           .fontSize(11)
           .font('Helvetica')
           .text(line, {
             align: 'left',
             lineGap: 4,
             indent: 20
           });
        doc.moveDown(0.2);
      } else {
        // Regular paragraph text
        doc.fillColor(darkGray)
           .fontSize(11)
           .font('Helvetica')
           .text(line, {
             align: 'left',
             lineGap: 5
           });
        doc.moveDown(0.3);
      }
    }

    // Footer on last page
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Footer line
      doc.strokeColor(lightGray)
         .lineWidth(0.5)
         .moveTo(60, doc.page.height - 50)
         .lineTo(doc.page.width - 60, doc.page.height - 50)
         .stroke();
      
      // Page number
      doc.fillColor(lightGray)
         .fontSize(9)
         .font('Helvetica')
         .text(
           `Page ${i + 1} of ${pageCount}`,
           60,
           doc.page.height - 40,
           { align: 'center' }
         );
    }

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

import { CohereClientV2 } from "cohere-ai";

const co = new CohereClientV2({
  token: process.env.COHERE_API_KEY
});

app.post('/generate-summary', async (req, res) => {
  try {
    const { transcript, duration, summaryStructure, customPrompt } = req.body;

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ error: 'Transcript is required and cannot be empty' });
    }

    const structure = summaryStructure?.length > 0 
      ? summaryStructure.join('\n')
      : `1. Meeting Overview
2. Key Discussion Points
3. Decisions Made
4. Action Items (if any)
5. Next Steps (if mentioned)`;

    const basePrompt = customPrompt || 
      `Please provide a comprehensive summary of the following meeting transcript. Include key points discussed, decisions made, action items, and any important details. Format the summary in a professional manner suitable for sharing with meeting participants.`;

    const prompt = `${basePrompt}

Meeting Duration: ${duration || 'Not specified'}
Date: ${new Date().toLocaleDateString()}

Transcript:
${transcript}

Please structure your summary with the following sections:
${structure}`;

    // ✅ New API call
    const response = await co.chat({
      model: "command-a-03-2025",
      messages: [{ role: "user", content: prompt }],
    });

    const aiSummary = response.message?.content[0]?.text?.trim() || 'No summary generated.';

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
      model_used: response.model,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating summary with Cohere:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      details: error.message
    });
  }
});



app.listen(port, () => {
  console.log(`Meeting Recorder API Server running on port ${port}`);

});