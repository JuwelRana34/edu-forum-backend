const express = require("express");
const app = express();
let jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//  middleware
app.use(
  cors({
    origin: ["https://edu-forum-bd.web.app","https://edu-forum.netlify.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
require("dotenv").config();

// stripe setup

const stripe = require("stripe")(process.env.PAYMENT_SECRET);

// database setup
const uri = `mongodb+srv://${process.env.DB_UserName}:${process.env.DB_Pass}@cluster0.ocbhdf0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
const tags = database.collection("tags ");

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
const isAdmin = async (req, res, next) => {
  const email = req.email;
  const user = await users.findOne({ email: email });
  if (user.role !== "admin") {
    return res.status(403).send({ message: " unauthorized access" });
  }

  next();
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

app.get("/", async (req, res) => {
  // const response = await users.find().toArray();
  res.send("hello world");
});

// user api
app.post("/user", async (req, res) => {
  const userinfo = req.body;
  const user = await users.findOne({ email: userinfo.email });
  if (user) {
    return res.send({ message: "User already exists" });
  }
  const response = await users.insertOne({
    ...userinfo,
    role: "user",
    badge: "bronze",
    createdAt: new Date(),
  });
  res.send(response);
});
app.get("/user", verifyToken, async (req, res) => {
  const { email } = req.query;
  if (req.email !== email) return res.send({ message: "unauthorize access" });
  const user = await users.findOne({ email: email });

  res.send(user);
});
app.get("/user/recentPost", verifyToken, async (req, res) => {
  const { email } = req.query;
  if (req.email !== email) return res.send({ message: "unauthorize access" });
  const recentPosts = await posts
    .aggregate([
      {
        $match: { Author_Email: email },
      },
      {
        $addFields: {
          id: { $toString: "$_id" },
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "id",
          foreignField: "postId",
          as: "comments",
        },
      },
      {
        $project: {
          _id: 1,
          Title: 1,
          Description: 1,
          tag: 1,
          Author_Image: 1,
          Author_Name: 1,
          Author_Email: 1,
          UpVote: 1,
          DownVote: 1,
          createdAt: 1,
          comments: 1,
          popularity: 1,
        },
      },

      {
        $sort: { popularity: -1 },
      },
    ])
    .limit(3)
    .toArray();

  res.send(recentPosts);
});
app.get("/users", verifyToken, isAdmin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const total = await users.countDocuments();
    const items = await users.find().skip(skip).limit(limit).toArray();

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/makeAdmin", verifyToken, isAdmin, async (req, res) => {
  const { userName } = req.query;
  const user = await users.updateOne(
    { name: userName },
    { $set: { role: "admin" } }
  );
  res.send(user);
});

// tag api
app.post("/tag", verifyToken, isAdmin, async (req, res) => {
  const tag = req.body;
  const response = await tags.insertOne(tag);
  res.send(response);
});
app.get("/tag", async (req, res) => {
  const response = await tags.find().toArray();
  res.send(response);
});

// admin api

app.get("/admin/:email", verifyToken, async (req, res) => {
  const { email } = req.params;
  if (req.email !== email) return res.send({ message: "unauthorize access" });

  const user = await users.findOne({ email: email });
  let admin = false;
  if (user) {
    admin = user.role === "admin";
  }
  res.send({ admin });
});

app.get("/info-full-web", verifyToken, async (req, res) => {
  const totalUser = await users.countDocuments({});
  const totalComment = await comments.countDocuments({});
  const totalPosts = await posts.countDocuments({});

  res.send({
    totalUser: totalUser,
    totalComment: totalComment,
    totalPosts: totalPosts,
  });
});
//post api
app.post("/post", verifyToken, async (req, res) => {
  const post = req.body;
  const postCount = await posts.countDocuments({
    Author_Email: post.Author_Email,
  });
  const user = await users.findOne({ email: post.Author_Email });

  if (postCount >= 5 && user.badge !== "gold") {
    return res.status(403).send({
      message: "User can't post more than 5 please  become a gold member.",
    });
  }

  const response = await posts.insertOne({
    ...post,
    voteBy: [],
    createdAt: new Date(),
  });
  res.send(response);
});

app.get("/postDetails/:id", async (req, res) => {
  const { id } = req.params;

  const post = await posts
    .aggregate([
      {
        $match: { _id: new ObjectId(id) },
      },
      {
        $addFields: {
          id: { $toString: "$_id" },
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "id",
          foreignField: "postId",
          as: "comments",
        },
      },
      {
        $project: {
          _id: 1,
          Title: 1,
          Description: 1,
          tag: 1,
          Author_Image: 1,
          Author_Name: 1,
          Author_Email: 1,
          UpVote: 1,
          DownVote: 1,
          createdAt: 1,
          comments: 1,
          popularity: 1,
        },
      },
    ])
    .toArray();
  res.send(post[0]);
});

app.get("/checkPostCount", verifyToken, async (req, res) => {
  const { email } = req.query;
  if (req.email !== email) return res.send({ message: "unauthorize access" });
  const isGold = await users.findOne({ email: email });

  const postCount = await posts.countDocuments({ Author_Email: email });
  res.send({ postCount: postCount, membership: isGold.badge });
});

// get all post with tag and scherch

app.get("/AllPost", async (req, res) => {
  const { tag, search, page = 1, limit = 10 } = req.query;
  try {
    const limitNum = parseInt(limit, 10);

    let query = {};

    if (tag) {
      query = { tag: tag };
    }

    if (search) {
      query = { tag: { $regex: `^${search}$`, $options: "i" } };
    }

    const skip = (page - 1) * limitNum;

    const response = await posts
      .aggregate([
        { $match: query },
        { $addFields: { id: { $toString: "$_id" } } },
        {
          $lookup: {
            from: "comments",
            localField: "id",
            foreignField: "postId",
            as: "comments",
          },
        },
        {
          $project: {
            _id: 1,
            Title: 1,
            Description: 1,
            tag: 1,
            Author_Image: 1,
            Author_Name: 1,
            Author_Email: 1,
            UpVote: 1,
            DownVote: 1,
            createdAt: 1,
            comments: 1,
            popularity: 1,
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
      ])
      .toArray();
    const totalPosts = await posts.countDocuments(query);
    const totalPages = Math.ceil(totalPosts / limitNum);
    res.send({ posts: response, totalPages: totalPages });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

app.get("/sortByPopularity", async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  try {
    const limitNum = parseInt(limit, 10);

    const skip = (page - 1) * limitNum;

    const post = await posts
      .aggregate([
        {
          $addFields: {
            popularity: { $subtract: ["$UpVote", "$DownVote"] },
          },
        },
        {
          $addFields: {
            id: { $toString: "$_id" },
          },
        },
        {
          $lookup: {
            from: "comments",
            localField: "id",
            foreignField: "postId",
            as: "comments",
          },
        },
        {
          $project: {
            _id: 1,
            Title: 1,
            Description: 1,
            tag: 1,
            Author_Image: 1,
            Author_Name: 1,
            Author_Email: 1,
            UpVote: 1,
            DownVote: 1,
            createdAt: 1,
            comments: 1,
            popularity: 1,
          },
        },
        {
          $sort: { popularity: -1 },
        },
        { $skip: skip },
        { $limit: limitNum },
      ])
      .toArray();

    const totalPosts = await posts.countDocuments();
    const totalPages = Math.ceil(totalPosts / limitNum);
    res.send({ posts: post, totalPages: totalPages });
  } catch (error) {
    console.error("Error sorting by popularity:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/mypost", verifyToken, async (req, res) => {
  const { email } = req.query;

  if (req.email !== email) return res.send({ message: "unauthorize access" });

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const total = await posts.countDocuments();
    const items = await posts
      .find({ Author_Email: email })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/deleteMyPost/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;

  if (req.email !== email) return res.send({ message: "unauthorize access" });

  await comments.deleteMany({ postId: id });

  const response = await posts.deleteOne({ _id: new ObjectId(id) });

  res.send(response);
});

// comments

app.post("/comment", verifyToken, async (req, res) => {
  const comment = req.body;
  const response = await comments.insertOne(comment);
  res.send(response);
});

app.get("/getComments/:postId", verifyToken, async (req, res) => {
  const { postId } = req.params;

  const results = await comments.find({ postId: postId }).toArray();
  res.send(results);
});

///make-announcement

app.post("/make-announcement", verifyToken, isAdmin, async (req, res) => {
  const announcement = req.body;
  const response = await announcements.insertOne({
    ...announcement,
    createdAt: new Date(),
  });
  res.send(response);
});

app.get("/get-all-announcement", async (req, res) => {
  const response = await announcements.find().toArray();
  res.send(response);
});

app.delete(
  "/announcements/delete/:id",
  verifyToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    const response = await announcements.deleteOne({ _id: new ObjectId(id) });
    res.send(response);
  }
);

// reports

app.post("/comments_report", verifyToken, async (req, res) => {
  const reportInfo = req.body;
  const response = await reports.insertOne({
    ...reportInfo,
    createdAt: new Date(),
  });
  res.send(response);
});

app.get("/get-all-reports", verifyToken, isAdmin, async (req, res) => {
  // const response = await reports.find().toArray();
  const response = await reports
    .aggregate([
      {
        $addFields: { id: { $toObjectId: "$commentId" } },
      },
      {
        $lookup: {
          from: "comments",
          localField: "id",
          foreignField: "_id",
          as: "comment",
        },
      },
      {
        $unwind: "$comment",
      },
      {
        $project: {
          _id: 1,
          commentId: 1,
          comment: "$comment.comment",
          repoter: 1,
          feedback: 1,
          commenter: 1,
        },
      },
    ])
    .toArray();

  res.send(response);
});
app.delete(
  "/delete-comment/:reportId/:commentId",
  verifyToken,
  isAdmin,
  async (req, res) => {
    const { reportId, commentId } = req.params;
    await reports.deleteOne({ _id: new ObjectId(reportId) });
    const response = await comments.deleteOne({ _id: new ObjectId(commentId) });
    res.send(response);
  }
);

// payments api

app.post("/create-payment-intent", verifyToken, async (req, res) => {
  const { price } = req.body;
  const totalPrice = price * 100;
  const { client_secret } = await stripe.paymentIntents.create({
    amount: totalPrice,
    currency: "usd",
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.send({ client_secret: client_secret });
});
// votes

app.patch("/vote-upvote-downvote", verifyToken, async (req, res) => {
  const { postId, userEmail, action } = req.body;

  try {
    const post = await posts.findOne({ _id: new ObjectId(postId) });

    const voteBy = post.voteBy || [];

    // current vote of user
    const currentVote = voteBy.find((vote) => vote.userEmail === userEmail);

    // update query
    let updateQuery = {};

    if (action === "upvote") {
      if (currentVote && currentVote.action === "upvote") {
        updateQuery = {
          $inc: { UpVote: -1 },
          $pull: { voteBy: { userEmail } },
        };
      } else {
        updateQuery = {
          $inc: {
            UpVote: 1,
            ...(currentVote && currentVote.action === "downvote"
              ? { DownVote: -1 }
              : {}),
          },
          $set: {
            voteBy: [
              ...voteBy.filter((vote) => vote.userEmail !== userEmail),
              { userEmail, action: "upvote" },
            ],
          },
        };
      }
    } else if (action === "downvote") {
      if (currentVote && currentVote.action === "downvote") {
        updateQuery = {
          $inc: { DownVote: -1 },
          $pull: { voteBy: { userEmail } },
        };
      } else {
        updateQuery = {
          $inc: {
            DownVote: 1,
            ...(currentVote && currentVote.action === "upvote"
              ? { UpVote: -1 }
              : {}),
          },
          $set: {
            voteBy: [
              ...voteBy.filter((vote) => vote.userEmail !== userEmail),
              { userEmail, action: "downvote" },
            ],
          },
        };
      }
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    const result = await posts.updateOne(
      { _id: new ObjectId(postId) },
      updateQuery
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: "No changes post" });
    }
    res.json({ success: true, message: "Vote updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while updating the vote" });
  }
});

app.post("/charge-payment", verifyToken, async (req, res) => {
  const { email, amount, paymentIntentId } = req.body;

  const updateMemberShip = await users.updateOne(
    { email: email },
    { $set: { badge: "gold" } }
  );
  const payment = await payments.insertOne({
    email: email,
    amount: amount,
    paymentIntentId: paymentIntentId,
    createdAt: new Date(),
  });

  res.send("payment successfully done now you are a gold member");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: "Something went wrong!" });
});
app.listen(port, (req, res) => {
  console.log(`Server running on port ${port}`);
});
