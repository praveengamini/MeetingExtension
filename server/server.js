import express from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path'
import { fileURLToPath } from 'url';
import cors from 'cors'
import multer from 'multer'
import nodemailer from 'nodemailer'
const app = express();
const upload = multer()
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.json());
app.use(morgan('dev'));
app.use(cors())
dotenv.config();
const port = process.env.PORT || 5000;

app.post('/generate-pdf', async (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    const doc = new PDFDocument();
    const filename = 'output.pdf';
    const filePath = path.join(__dirname, filename);

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    doc.pipe(res);

    doc.fontSize(16).text(content, { align: 'left' });
    doc.end();

    writeStream.on('finish', () => {
        console.log(`PDF saved as ${filename}`);

        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error deleting the file:', err);
            } else {
                console.log('File deleted successfully');
            }
        });
    });
});
  
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL, 
    pass: process.env.EMAIL_PASSWORD,
  },
});
  app.post('/dispatch-mails', upload.single('summaryPdf'), async (req, res) => {
    try {
      const subject = req.body.subject;
      const mails = JSON.parse(req.body.mails);
      const summaryPdf = req.file; 
  
      if (!subject || !mails || !summaryPdf) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
  
      console.log('Subject:', subject);
      console.log('Mails:', mails);
      console.log('PDF File:', summaryPdf);
  
      for (const email of mails) {
        const mailOptions = {
          from: 'wefrnds891@gmail.com', 
          to: email, 
          subject: subject, 
          text: 'Please find the attached summary PDF.', 
          attachments: [
            {
              filename: summaryPdf.originalname, 
              content: summaryPdf.buffer,
            },
          ],
        };
  
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${email}`);
      }
  
      res.status(200).json({ message: 'Emails dispatched successfully!' });
    } catch (error) {
      console.error('Error processing submission:', error);
      res.status(500).json({ error: 'An error occurred while processing your request' });
    }
  });
  

app.get('/', (req, res) => {
    res.send("<h1>Hello</h1>");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
