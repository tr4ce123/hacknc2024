import axios from "axios"
import express from "express";
import "dotenv/config";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.OAUTH_CLIENT_ID);
const app = express();
const PORT = process.env.PORT || 3000;

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

    // If not found in database, create account
    // else just authenticate them

    res.status(200).send("Registration Successful!");
  } catch (err) {
    console.error("Error during registration:", err);
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

    const user = await verify(id_token);
    console.log("User Info:", user);

    // Check if user exists in database, etc.

    res.status(200).send("Login Successful!");
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).send("Login Failed");
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
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
