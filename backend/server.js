import axios from "axios";
import bcrypt from "bcrypt";
import express from "express";
import cors from "cors";
import "dotenv/config";
import { OAuth2Client } from "google-auth-library";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import FormData from "form-data";

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
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        uid VARCHAR(100) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vods (
        vod_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        video_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notes (
        note_id SERIAL PRIMARY KEY,
        vod_id INTEGER REFERENCES vods(vod_id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        timestamp INTEGER,
        parent_note_id INTEGER REFERENCES notes(note_id) ON DELETE CASCADE,
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
    origin: `${process.env.FRONTEND_URL}`,
    allowedHeaders: ["GET", "POST"],
  })
);

// Directory names for parsing the audio URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Endpoints

// Transcription endpoint
app.post("/transcribe", async (req, res) => {
  const { audioUrl } = req.body;

  if (!audioUrl) {
    return res
      .status(400)
      .json({ error: "No audioUrl provided in the request body." });
  }

  try {
    new URL(audioUrl);
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

    console.log("Requesting transcription");
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

    console.log("Transcription successful");

    return res.status(200).json({
      message: transcriptionResponse.data.text,
      segments: transcriptionResponse.data.segments,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "An error occurred during transcription." });
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
  try {
    const { user_id, title, video_url } = req.body;
    const result = await pool.query(
      "INSERT INTO vods (user_id, title, video_url) VALUES ($1, $2, $3) RETURNING *",
      [user_id, title, video_url]
    );

    res
      .status(201)
      .json({ message: "VOD added successfully", vod: result.rows[0] });
  } catch (error) {
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

// Function that verifies user based on Google OAuth token
async function verify(userToken) {
  try {
    const ticket = await oauth_client.verifyIdToken({
      idToken: userToken,
      audience: process.env.OAUTH_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload;
  } catch (err) {
    console.error("Error verifying ID token:", err);
    return null;
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
