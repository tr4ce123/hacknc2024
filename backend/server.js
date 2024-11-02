import axios from "axios";
import bcrypt from "bcrypt";
import express from "express";
import cors from "cors";
import "dotenv/config";
import { OAuth2Client } from "google-auth-library";
import pkg from 'pg';
import fs from "fs";
import OpenAI from "openai";

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
const openai_client = new OpenAI({apiKey: `${process.env.OPENAI_API_KEY}`});

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.static("public"));
app.use(express.json());
app.use(cors({
  origin: `${process.env.FRONTEND_URL}`,
  allowedHeaders: ["GET", "POST"],
}))



// Audio TESTING
const audioUrl =
  'https://assembly.ai/sports_injuries.mp3'


app.use("/transcribe", async (req, res) => {
  const transcription = await openai_client.audio.transcriptions.create({
    file: audioUrl,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });


  res.json({message: transcription.text})
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

  } catch (err) {
    // SQL UNIQUE CONSTRAINT ERROR
    if (err.code === '23505') {
      return res.status(400).json({ message: 'User already in database' });
    }
    res.status(500).send("Registration Failed");
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


    res.status(200).json({message: "Successfully registered", user});
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ error: "Login Failed" });
  }
});

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
