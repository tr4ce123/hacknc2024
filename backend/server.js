import axios from "axios";
import bcrypt from "bcrypt";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from 'path';
dotenv.config();
import { OAuth2Client } from "google-auth-library";
import pkg from "pg";
import FormData from "form-data";
import OpenAI from "openai";

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
import { Readable } from 'stream';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool
  .connect()
  .then(() => {
    console.log("Connected to DB");
  })
  .catch(() => {
    console.log("Didn't connect");
  });

// Initialize tables
(async () => {
  try {
    await pool.query(`

      CREATE TABLE IF NOT EXISTS public.vods (
        vod_id SERIAL PRIMARY KEY,
        id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        video_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS public.notes (
        note_id SERIAL PRIMARY KEY,
        vod_id INTEGER REFERENCES public.vods(vod_id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        timestamp INTEGER,
        parent_note_id INTEGER REFERENCES public.notes(note_id) ON DELETE CASCADE,
        bullet_order INTEGER
      );

    `);
    console.log("Tables created successfully.");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
})();

const oauth_client = new OAuth2Client(process.env.OAUTH_CLIENT_ID);
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.static("public"));
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/notes/:vod_id", async (req, res) => {
  const { vod_id } = req.params;

  try {
    const result = await pool.query("SELECT * FROM notes WHERE vod_id = $1", [
      vod_id,
    ]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// Get Vods
app.get("/vods/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("SELECT * FROM vods WHERE id = $1", [id]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching VODs:", error);
    res.status(500).json({ error: "Failed to fetch VODs" });
  }
});


// Remove a vod
app.delete("/vods/:vod_id", async (req, res) => {
  const { vod_id } = req.params;

  try {
    const result = await pool.query("DELETE FROM vods WHERE vod_id = $1", [
      vod_id,
    ]);
    res.status(200).json({ message: "VOD deleted successfully" });
  } catch (error) {
    console.error("Error deleting VOD:", error);
    res.status(500).json({ error: "Failed to delete VOD" });
  }
})

async function transcribeVideo(videoUrl, vodId) {
  try {
    // This downloads the video
    const videoResponse = await axios.get(videoUrl, { responseType: "stream" });

    const tempVidPath = path.join(__dirname, `temp_video_${vodId}.mp4`);
    const tempVidWriter = fs.createWriteStream(tempVidPath);
    videoResponse.data.pipe(tempVidWriter);

    await new Promise((resolve, reject) => {
      tempVidWriter.on('finish', resolve);
      tempVidWriter.on('error', reject);
    });

    const tempAudioPath = path.join(__dirname, `temp_audio_${vodId}.mp3`);

    await new Promise((resolve, reject) => {
      ffmpeg(tempVidPath)
        .output(tempAudioPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    const audioData = fs.createReadStream(tempAudioPath);

    const formData = new FormData();
    formData.append("file", audioData, {
      filename: 'audio.mp3',
      contentType: "audio/mpeg",
    });
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");

    const transcriptionResponse = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    console.log(transcriptionResponse.data);
    const segments = transcriptionResponse.data.segments;

    const chunkSize = 20; 
    const chunks = [];
    let currentChunk = { start: 0, end: 0, text: '' };

    for (const segment of segments) {
      if (currentChunk.text === '') {
        currentChunk.start = segment.start;
      }

      currentChunk.end = segment.end;
      currentChunk.text += ' ' + segment.text;

      if (currentChunk.end - currentChunk.start >= chunkSize) {
        chunks.push({ ...currentChunk });
        currentChunk = { start: currentChunk.end, end: currentChunk.end, text: '' };
      }
    }

    // Residual text
    if (currentChunk.text !== '') {
      chunks.push({ ...currentChunk });
    }

    console.log(`Total chunks created: ${chunks.length}`);

    // Each chunk is getting processed here because we can't fit the whole thing in one query
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const start = Math.floor(chunk.start);
      const text = chunk.text;

      let bulletOrder = 1;
    
      console.log(`Processing chunk ${i + 1}/${chunks.length}, start time: ${start}s`);
    
      const numTokens = text.split(' ').length;
      if (numTokens > 2000) {
        console.warn(`Chunk ${i + 1} exceeds token limit, reducing chunk size.`);
        continue;
      }
    
      const prompt = `
        Text: "${text}"
    
        Pretend you are writing notes for a college student.
        From the text above, first extract a concise 'Main Chunk Concept' that summarizes the central idea of the text into three to five words.
        Do not say "the text says" or "the text is about" in the summary. You are taking notes for a college student on a video that has been transalated into text.
    
        Then, generate structured notes with main points and sub-points in the following format:
    
        Format:
        Main Chunk Concept: [Main concept here]

        Note: do not literally put 'Main point 1', 'Sub-point 1.1', etc. in the notes.
    
        - Main point 1
          - Sub-point 1.1
          - Sub-point 1.2
        - Main point 2
      `;
    
      const gptResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      });
    
      const responseContent = gptResponse.choices[0].message.content.trim();
      const lines = responseContent.split('\n');
    
      let mainChunkConcept = '';
      let notesLines = [];
      let inNotes = false;
    
      for (let line of lines) {
        if (line.startsWith('Main Chunk Concept:')) {
          mainChunkConcept = line.replace('Main Chunk Concept:', '').trim();
        } else if (line.startsWith('-') || line.startsWith('  -')) {
          inNotes = true;
          notesLines.push(line);
        } else if (inNotes && line.trim() === '') {
          
        }
      }
    
      // Insert the Main Chunk Concept
      const chunkNoteResult = await pool.query(
        `INSERT INTO public.notes (vod_id, text, timestamp, bullet_order)
        VALUES ($1, $2, $3, $4) RETURNING note_id`,
        [vodId, mainChunkConcept, start, bulletOrder]
      );
      const chunkNoteId = chunkNoteResult.rows[0].note_id;
      bulletOrder++;
    
      // Insert the structured notes
      let parentNoteId = null;
    
      for (const line of notesLines) {
        if (line.startsWith('- ')) {
          const noteText = line.replace(/^- /, '').trim();
    
          const note = await pool.query(
            `INSERT INTO public.notes (vod_id, text, timestamp, parent_note_id, bullet_order)
            VALUES ($1, $2, $3, $4, $5) RETURNING note_id`,
            [vodId, noteText, start, chunkNoteId, bulletOrder]
          );
          parentNoteId = note.rows[0].note_id;
          bulletOrder++;
        } else if (line.startsWith('  -')) {
          const subNoteText = line.replace(/^ {2}- /, '').trim();
    
          await pool.query(
            `INSERT INTO public.notes (vod_id, text, timestamp, parent_note_id, bullet_order)
            VALUES ($1, $2, $3, $4, $5)`,
            [vodId, subNoteText, start, parentNoteId, bulletOrder]
          );
          bulletOrder++;
        }
      }
    }
    
      // Clean up temporary files
      fs.unlinkSync(tempVidPath);
      fs.unlinkSync(tempAudioPath);

      console.log('Transcription and note generation completed successfully.');
    } catch (error) {
      console.error('Error during transcription process:', error);
    }
  
};

// User registration
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
      [username, hashedPassword]
    );

    res
      .status(201)
      .json({ message: "User registered successfully", user: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      res.status(400).json({ error: "Username already exists" });
    } else {
      res.status(500).json({ error: "Registration failed" });
    }
  }
});

// User login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const userResult = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      res.status(200).json({ message: "Login successful", user });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Add VOD
app.post("/add-vod", async (req, res) => {
  console.log("Received a request at /add-vod");
  try {
    const { id, title, video_url } = req.body;

    console.log("Received data:", { id, title, video_url }); 

    // Check for missing fields
    if (!id || !title || !video_url) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Insert the VOD into the database
    const result = await pool.query(
      "INSERT INTO vods (id, title, video_url) VALUES ($1, $2, $3) RETURNING *",
      [id, title, video_url]
    );

    console.log("VOD added to database:", result.rows[0]); 

    transcribeVideo(video_url, result.rows[0].vod_id);

    res
      .status(201)
      .json({ message: "VOD added successfully", vod: result.rows[0] });
  } catch (error) {
    console.error("Error adding VOD:", error); 
    res.status(500).json({ error: "Failed to add VOD" });
  }
});

// Add Note
app.post("/add-note", async (req, res) => {
  try {
    const { vod_id, text, timestamp, parent_note_id, bullet_order } = req.body;
    const result = await pool.query(
      "INSERT INTO notes (vod_id, text, timestamp, parent_note_id, bullet_order) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [vod_id, text, timestamp, parent_note_id, bullet_order]
    );

    res
      .status(201)
      .json({ message: "Note added successfully", note: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Failed to add note" });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});