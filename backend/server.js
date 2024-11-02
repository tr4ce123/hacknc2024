import axios from "axios";
import bcrypt from "bcrypt";
import express from "express";
import cors from "cors";
import "dotenv/config";
import { OAuth2Client } from "google-auth-library";
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from "url";
import FormData from 'form-data'


const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  }
});
pool.connect()
.then(() => {console.log("Connected to DB")})
.catch(() => {console.log("Didn't connect")})


// (async () => {
//   try {
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS users (
//         id SERIAL PRIMARY KEY,
//         username VARCHAR(100) UNIQUE NOT NULL,
//         password VARCHAR(100) NOT NULL
//       )
//     `);

//     console.log("Tables created successfully.");
//   } catch (error) {
//     console.error("Error creating tables:", error);
//   }
// })();


const oauth_client = new OAuth2Client(process.env.OAUTH_CLIENT_ID);

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.static("public"));
app.use(express.json());
app.use(cors({
  origin: `${process.env.FRONTEND_URL}`,
  allowedHeaders: ["GET", "POST"],
}))


// Directory names for parsing the audio URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.post('/transcribe', async (req, res) => {
  const { audioUrl } = req.body;

  if (!audioUrl) {
    return res.status(400).json({ error: 'No audioUrl provided in the request body.' });
  }

  // Get the URL from the request body and parse it
  try {
    new URL(audioUrl);
  } 
  catch (error) {
    return res.status(400).json({ error: 'Invalid URL format.' });
  }

  try {
    // Fetching the audio stream from the URL given
    const response = await axios.get(audioUrl, { responseType: 'stream' });

    // Extract the fields from the URL to pass into the API call
    const urlPath = new URL(audioUrl).pathname;
    const filename = path.basename(urlPath) || 'audio.mp3';

    // Get our form data to pass into the API call
    const formData = new FormData();
    formData.append('file', response.data, {
      filename: filename,
      contentType: response.headers['content-type'] || 'audio/mpeg',
    });
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');


    console.log("Requesting transcription");
    // Send our transcription request to OpenAI
    const transcriptionResponse = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    console.log("Transcription successful");

    // Send the transcription with timestamps back to the frontend
    return res.status(200).json({
      message: transcriptionResponse.data.text,
      segments: transcriptionResponse.data.segments,
    });
  } 
  catch (error) {
    return res.status(500).json({ error: 'An error occurred during transcription.' });
  }
});

app.post("/register", async (req, res) => {
  try {
    const id_token = req.body.id_token;
    console.log("ID Token:", id_token);

    if (!id_token) {
      return res.status(400).json({ error: "No ID Token provided" });
    }

    const user = await verify(id_token);


    // const hashedID = bcrypt.hashSync(id_token, 10);
    // await pool.query('INSERT INTO users (id_token, username) VALUES ($1, $2)', [hashedID, username]);
    // res.status(200).json({ message: 'User registered successfully' });

  } 
  catch (err) {
    // SQL UNIQUE CONSTRAINT ERROR
    if (err.code === '23505') {
      return res.status(400).json({ message: 'User already in database' });
    }
    return res.status(500).send("Registration Failed");
  }
});

app.post("/login", async (req, res) => {
  try {
    const id_token = req.body.id_token;
    console.log("ID Token:", id_token);

    if (!id_token) {
      return res.status(400).json({ error: "No ID Token provided" });
    }

    // Verify user
    const user = await verify(id_token);

    if (!user) {
      return res.status(400).json({ error: "Invalid ID Token" });
    }

    console.log("User Info:", user);


    return res.status(200).json({message: "Successfully registered", user});
  } 
  catch (err) {
    return res.status(500).json({ error: "Login Failed" });
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
