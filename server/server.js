const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.post('/api/generate-sentence', async (req, res) => {
  try {
    const { word, level, topic } = req.body;

    if (!word || !level || !topic) {
      return res.status(400).json({
        error: 'word, level and topic are required.'
      });
    }

    const prompt = `
You are an English learning assistant.

Create ONE English sentence for an English learner.

Required word: "${word}"
English level: ${level}
Topic: ${topic}

Rules:
- The sentence must naturally use the required word.
- The sentence must be appropriate for ${level} level.
- The sentence should be related to the topic "${topic}".
- Use simple and grammatically correct English.
- Return ONLY the sentence.
- Do not add quotation marks.
- Do not add explanations.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const sentence = response.text.trim();

    res.json({
      sentence
    });

  } catch (error) {
    console.error('Gemini error:', error);

    res.status(500).json({
      error: error.message
    });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});