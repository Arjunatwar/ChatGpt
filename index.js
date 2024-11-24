import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs/promises';

dotenv.config();

const app = express();
const port = 80;

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to parse form and JSON body data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'static')));

// Serve views
app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/output', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'views', 'output.html'));
});

// API Key Check
if (!process.env.API_KEY) {
  console.error('API Key not defined! Please set API_KEY in your .env file.');
  process.exit(1);
}

// Add configuration constants
const CONFIG = {
  model: 'gemini-pro', // Updated to use the latest model
  temperature: 0.7,
  maxOutputTokens: 1024,
};

// Initialize Google Generative AI
let genAI;
try {
  genAI = new GoogleGenerativeAI(process.env.API_KEY);
  const model = genAI.getGenerativeModel({ model: CONFIG.model });
} catch (error) {
  console.error('Failed to initialize Google Generative AI:', error.message);
  process.exit(1);
}

// Helper function to generate response
async function generateResponseFromPrompt(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: CONFIG.model });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error during AI generation:', error.message);
    throw new Error(`AI generation failed: ${error.message}`);
  }
}

// Add HTML template helper
function generateHtmlResponse(aiResponse) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Response</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .response-container {
                background-color: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                margin-top: 20px;
            }
            .timestamp {
                color: #666;
                font-size: 0.9em;
                margin-top: 10px;
            }
            .model-info {
                background-color: #e9ecef;
                padding: 8px;
                border-radius: 4px;
                margin-top: 10px;
                font-size: 0.9em;
            }
        </style>
    </head>
    <body>
        <div class="response-container">
            <h2>AI Response</h2>
            <div class="response-content">
                ${aiResponse.split('\n').map(line => `<p>${line}</p>`).join('')}
            </div>
            <div class="model-info">
                Model: ${CONFIG.model}
            </div>
            <div class="timestamp">
                Generated on: ${new Date().toLocaleString()}
            </div>
        </div>
    </body>
    </html>
  `;
}

// Route to generate response
app.post('/generate', async (req, res) => {
  const prompt  = req.body.ask;
  const wantsHtml = req.headers.accept?.includes('text/html');

  if (!prompt || typeof prompt !== 'string') {
    if (wantsHtml) {
      return res.status(400).send('<h1>Error: Valid prompt string is required!</h1>');
    }
    return res.status(400).json({ 
      error: 'Valid prompt string is required!',
      received: typeof prompt 
    });
  }

  try {
    const generatedResponse = await generateResponseFromPrompt(prompt);
    
    if (wantsHtml) {
      return res.status(200).send(generateHtmlResponse(generatedResponse));
    }

    return res.status(200).json({ 
      response: generatedResponse,
      model: CONFIG.model
    });
  } catch (error) {
    console.error('Error in /generate route:', error);
    
    if (wantsHtml) {
      return res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
    }

    return res.status(500).json({ 
      error: 'Failed to generate response',
      message: error.message 
    });
  }
});

// Add route for HTML form
app.get('/ask', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ask AI</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .form-container {
                background-color: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            textarea {
                width: 100%;
                min-height: 100px;
                margin: 10px 0;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            button {
                background-color: #007bff;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            button:hover {
                background-color: #0056b3;
            }
        </style>
    </head>
    <body>
        <div class="form-container">
            <h2>Ask the AI</h2>
            <form action="/generate" method="POST">
                <textarea name="prompt" placeholder="Enter your prompt here..." required></textarea>
                <button type="submit">Generate Response</button>
            </form>
        </div>
    </body>
    </html>
  `);
});

// Add global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Enhanced server startup
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Using AI model: ${CONFIG.model}`);
});

// Configure multer for file upload
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept only specific file types
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, and DOC/DOCX files are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});
