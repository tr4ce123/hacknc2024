import axios from "axios";
import express from "express";
import cors from "cors";
import "dotenv/config";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.OAUTH_CLIENT_ID);
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

app.post("/register", async (req, res) => {
  try {
    const id_token = req.body.id_token;
    console.log("ID Token:", id_token);

    if (!id_token) {
      return res.status(400).json({ error: "No ID Token provided" });
    }

    const user = await verify(id_token);

    if (!user) {
      return res.status(400).json({ error: "Invalid ID Token" });
    }

    // Add logic here to check if user exists in database
    // If not found, create account, otherwise authenticate them

    res.status(200).json({ message: "Registration Successful!", user });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ error: "Registration Failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const id_token = req.body.id_token;
    console.log("ID Token:", id_token);

    if (!id_token) {
      return res.status(400).json({ error: "No ID Token provided" });
    }

    const user = await verify(id_token);

    if (!user) {
      return res.status(400).json({ error: "Invalid ID Token" });
    }

    console.log("User Info:", user);

    // Add logic here to check if user exists in database

    res.status(200).json({ message: "Login Successful!" }, user);
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ error: "Login Failed" });
  }
});

async function verify(userToken) {
  try {
    const ticket = await client.verifyIdToken({
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
