import axios from "axios"
import express from "express"
import dotenv from "dotenv"
import { OAuth2Client } from "google-auth-library"

dotenv.config();
const client = new OAuth2Client();
const app = express()
const PORT = process.env.PORT

app.use(express.static('public'))
app.use(express.json());

app.use('/', (req, res) => {
   res.send("Hello")
})

app.post("/register", async (req, res) => {
  try {
    const id_token = res.body.id_token;
    console.log(id_token)

    if (!id_token){
      return res.status(400).json({error: "No ID Token"})
    }

    const user = await verify(id_token)
    console.log(user)
    
    // If not found in database, create account

    // else just authenticate them
    
    res.status(200);
  }
  catch(err){
    console.log("ERROR REGISTERING")
    res.status(500).send("REGISTER NOT WORKING")
  }
})

app.post("/login", async (req, res) => {
  try {
    const id_token = res.id_token;

  }
  catch(err){

  }
})


// Verify function for oauth
async function verify(userToken) {
  const ticket = await client.verifyIdToken({
    idToken: userToken,
    audience: process.env.OAUTH_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const userID = payload['sub'];
}



app.listen(PORT, () => {
  console.log("SERVER IS ON")
})