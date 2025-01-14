const express = require('express');
const app = express();
let jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//  middleware 
app.use(cors(
    {
        origin: ["http://localhost:5173","https://edu-forum-bd.web.app"],
        credentials: true
    }
));
app.use(express.json());
app.use(cookieParser());
require('dotenv').config()


// database setup 
const uri =`mongodb+srv://${process.env.DB_UserName}:${process.env.DB_Pass}@cluster0.ocbhdf0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// const uri ="mongodb://localhost:27017"

 // Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  const database = client.db("forum");
  const users = database.collection("users");
  const posts = database.collection("posts");
  const comments = database.collection("comments");
  const announcements = database.collection("announcements");
  const reports = database.collection("reports");
  const payments = database.collection("payments");
  const tags  = database.collection("tags ");
  

    

  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      // await client.connect();
      // Send a ping to confirm a successful connection
      // await database.command({ ping: 1 });
      console.log(
        "Pinged your deployment. You successfully connected to MongoDB!"
      );
    } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
    }
  }
  run().catch(console.dir);

 

// routes

// routes

app.post("/jwt", (req, res) => {

  const playload = req.body;

  let token = jwt.sign(playload, process.env.jwt_secret, { expiresIn: "365d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  });
  res.send({ success: true });
});

const verifyToken = (req, res, next) => {
  let token = req.cookies?.token;
  if (!token) {
    return res.status(403).send({ message: " unauthorized access" });
  }
  jwt.verify(token, process.env.jwt_secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: " unauthorized access" });
    }

    req.email = decoded.email;
    next();
  });
};



app.post("/logOut", (req, res) => {
  res
    .clearCookie("token", {
      maxAge: 0,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .send({ success: true });
});

app.get("/", async(req, res) => {
    // const response = await collection.find().toArray()
    res.send("response");
})

// user api 
app.post("/user", async(req, res) => {
   const userinfo = req.body
   const user = await users.findOne({email: userinfo.email})
   if(user){
     return res.send({message: "User already exists"})
   }
   const response = await users.insertOne({
    ...userinfo,
    role: "user",
    badge: "bronze",
    createdAt: new Date(), 
   })
    res.send(response);
})
app.get('/users', async(req, res) => {
  const user = await users.find().toArray()
  res.send(user)
})

// tag api 
app.post('/tag',verifyToken, async(req, res) => {
      const tag = req.body
      const response = await tags.insertOne(tag)
      res.send(response)
});
app.get('/tag', async(req, res) => {
      const response = await tags.find().toArray()
      res.send(response)
});



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: "Something went wrong!" });
});





app.listen(port, (req, res) => {
    console.log(`Server running on port ${port}`);
});