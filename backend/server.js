import axios from "axios";
import bcrypt from "bcrypt";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
dotenv.config();
import { OAuth2Client } from "google-auth-library";
import pkg from "pg";
import FormData from "form-data";
import OpenAI from "openai";

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
});

app.post("/transcribe", async (req, res) => {
  const { audioUrl, vodId } = req.body;

  if (!audioUrl || !vodId) {
    return res.status(400).json({ error: "audioUrl and vodId are required." });
  }

  try {
    new URL(audioUrl);

    // Step 1: Request transcription from OpenAI Whisper API
    const response = await axios.get(audioUrl, { responseType: "stream" });
    const urlPath = new URL(audioUrl).pathname;
    const filename = path.basename(urlPath) || "audio.mp3";

    const formData = new FormData();
    formData.append("file", response.data, {
      filename: filename,
      contentType: response.headers["content-type"] || "audio/mpeg",
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
    const notes = [];

    // Step 2: Process each segment with OpenAI API to generate notes
    for (const segment of segments) {
      const start = Math.floor(segment.start);
      const text = segment.text;

      const prompt = `
        Text: "${text}"
        
        Generate structured notes in chronological order with main points and sub-bullets.
        Format:
        - Main point 1
          - Sub-point 1.1
          - Sub-point 1.2
        - Main point 2
      `;

      const gptResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
      });
      console.log(gptResponse.choices[0].message.content);

      const generatedNotes = gptResponse.choices[0].message.content
        .trim()
        .split("\n");

      // Step 3: Convert generated notes into database entries
      let bulletOrder = 1;
      let parentNoteId = null;

      for (const line of generatedNotes) {
        if (line.startsWith("-")) {
          const noteText = line.replace(/^- /, "").trim();

          // Insert main point into database
          const note = await pool.query(
            `INSERT INTO public.notes (vod_id, text, timestamp, bullet_order)
            VALUES ($1, $2, $3, $4) RETURNING note_id`,
            [vodId, noteText, start, bulletOrder]
          );

          parentNoteId = note.rows[0].note_id;
          bulletOrder++;
        } else if (line.startsWith("  -")) {
          const subNoteText = line.replace(/^ {2}- /, "").trim();

          // Insert sub-bullet with parent_note_id
          await pool.query(
            `INSERT INTO public.notes (vod_id, text, timestamp, parent_note_id, bullet_order)
            VALUES ($1, $2, $3, $4, $5)`,
            [vodId, subNoteText, start, parentNoteId, bulletOrder]
          );

          bulletOrder++;
        }

        console.log("Inserted into db");
      }
    }

    res
      .status(200)
      .json({ message: "Notes generated and saved successfully." });
  } catch (error) {
    console.error("Error during transcription or note generation:", error);
    res.status(500).json({
      error: "An error occurred during transcription and note processing.",
    });
  }
});

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
