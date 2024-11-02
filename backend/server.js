import axios from "axios"
import express from "express"


const app = express()
const PORT = 8080

app.use("/", () => {
  
})



app.listen(PORT, () => {
  console.log("SERVER IS ON")
})