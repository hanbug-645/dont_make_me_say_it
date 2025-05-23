const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
const { generateSystemPrompt } = require('./prompts');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Load the Perplexity API key from config
function loadApiKey() {
  try {
    const configData = fs.readFileSync('config.json', 'utf8');
    const config = JSON.parse(configData);
    return config.PERPLEXITY_API_KEY;
  } catch (error) {
    console.error(`Error loading config: ${error.message}`);
    return null;
  }
}

// API endpoint to communicate with Perplexity API
app.post('/api/chat', async (req, res) => {
  try {
    const { message, secretKeyword, currentRound, chatHistory } = req.body;
    
    if (!message || !secretKeyword) {
      return res.status(400).json({ error: 'Message and secret keyword are required' });
    }
    
    // Get the system instruction from the prompts module
    const systemInstruction = generateSystemPrompt(secretKeyword, currentRound);
    
    // Initialize with the system message
    const messages = [
      { role: "system", content: systemInstruction }
    ];
    
    // We need to ensure we have alternating user/assistant messages in the correct sequence
    // Process the chat history to create properly alternating user/assistant messages
    
    if (chatHistory && chatHistory.length > 0) {
      // Create arrays to hold user and assistant messages
      const userMessages = [];
      const assistantMessages = [];
      
      // Separate user and assistant messages
      for (let i = 0; i < chatHistory.length; i++) {
        const msg = chatHistory[i];
        if (msg.role === "user") {
          userMessages.push({
            role: "user",
            content: msg.parts[0].text
          });
        } else if (msg.role === "model") {
          assistantMessages.push({
            role: "assistant",
            content: msg.parts[0].text
          });
        }
      }
      
      // Add messages in alternating order
      // We should have equal or one less assistant message than user messages
      const messageCount = Math.min(userMessages.length, assistantMessages.length);
      
      for (let i = 0; i < messageCount; i++) {
        messages.push(userMessages[i]);
        messages.push(assistantMessages[i]);
      }
      
      // If there's one more user message than assistant messages, add it
      if (userMessages.length > assistantMessages.length) {
        messages.push(userMessages[userMessages.length - 1]);
      }
    }
    
    // Add the current user message if it's not already included in the history
    // This ensures we always end with a user message
    if (chatHistory.length === 0 || chatHistory[chatHistory.length - 1].role !== "user" || 
        chatHistory[chatHistory.length - 1].parts[0].text !== message) {
      messages.push({
        role: "user",
        content: message
      });
    }
    
    console.log("Sending to Perplexity API:", JSON.stringify(messages, null, 2));
    
    // Load API key
    const apiKey = loadApiKey();
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'API key not found in config.json'
      });
    }
    
    // Initialize the OpenAI client with Perplexity base URL
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.perplexity.ai"
    });
    
    try {
      // Make the API request to Perplexity
      const completion = await client.chat.completions.create({
        model: "sonar-pro",
        messages: messages,
        temperature: 0.8,
        max_tokens: 150
      });
      
      // Extract the response text
      const aiResponseText = completion.choices[0].message.content;
      
      return res.json({
        success: true,
        data: {
          content: aiResponseText
        }
      });
    } catch (error) {
      console.error("Perplexity API Error:", error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get response from Perplexity API',
        details: error.message
      });
    }
    
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process your request',
      details: error.message
    });
  }
});

// Create a public directory if it doesn't exist
if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public');
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
