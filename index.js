require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.POST || 3000;

// MiddleWare
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xevudqv.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    client.connect();

    // MongoDB Collection
    const database = client.db("summerCourseSchoolDB");
    const usersDB = database.collection("users");
    const classesDB = database.collection("classes");
    const instructorsDB = database.collection("instructros");
    const studentsFeedBackDB = database.collection("studentsFeedBacks");

    // Test API
    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    // Users API
    app.post("/users", async (req, res) => {
      const user = req.body;
      const filler = await usersDB.findOne({ email: user.email });
      if (filler) {
        return res.status(401).send({ message: "User Already Exit" });
      }
      const result = await usersDB.insertOne(user);
      res.send(result);
    });

    // Classes API
    app.get("/classes-popular", async (req, res) => {
      const limit = req.query?.limit;
      const query = { popularity: "Popular" };
      const totalPopularClasses = await classesDB.countDocuments(query);
      const popularClasses = await classesDB
        .find(query)
        .limit(limit & limit)
        .sort({ name: 1 })
        .toArray();
      res.send({
        totalPopularClasses,
        popularClasses,
      });
    });

    // Instructors API
    app.get("/instructors-popular", async (req, res) => {
      const query = { popularity: "Popular" };
      const popularInstructors = await instructorsDB.find(query).toArray();
      res.send(popularInstructors);
    });

    app.get("/total-instructors-count", async (req, res) => {
      const totalDataCount = await instructorsDB.estimatedDocumentCount();
      res.send({ totalDataCount });
    });

    app.get("/all-instructors", async (req, res) => {
      const query = { category: req.query?.category };
      const allCategory = await instructorsDB
        .aggregate([
          { $group: { _id: "$category", category: { $first: "$category" } } },
          { $project: { _id: 0, category: "$_id" } },
          { $sort: { category: 1 } },
        ])
        .toArray();

      // All Instructors
      // Pagination
      const page = parseInt(req.query?.page) || 1;
      const limit = parseInt(req.query?.limit) || 6;
      const skip = (page - 1) * limit;

      const allInstructors = await instructorsDB
        .find(query.category && query)
        .limit(limit)
        .skip(skip)
        .toArray();

      res.send({ allCategory, allInstructors });
    });

    app.get("/instructors/:category", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const result = await instructorsDB.find(query).toArray();
      res.send(result);
    });

    // Students API
    app.get("/students-feedback", async (req, res) => {
      const result = await studentsFeedBackDB.find().toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port);
