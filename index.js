require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_TOKEN);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.POST || 3000;

// MiddleWare
app.use(cors());
app.use(express.json());

// VerifyJWT
const VerifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access 2" });
    }
    req.decoded = decoded;
    next();
  });
};

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
    const paymentsDB = database.collection("payments");
    const cartsDB = database.collection("carts");
    const applyInstructorsDB = database.collection("applyInstructors");

    // Test API
    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    // JWT Token Sign
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });
      res.send({ token });
    });

    // Verify Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersDB.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden Message" });
      }
      next();
    };

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

    app.get("/total-classes-count", async (req, res) => {
      const totalDataCount = await classesDB.estimatedDocumentCount();
      res.send({ totalDataCount });
    });

    app.get("/all-classes", async (req, res) => {
      const query = { category: req.query?.category };
      const allCategory = await classesDB
        .aggregate([
          { $group: { _id: "$category", category: { $first: "$category" } } },
          { $project: { _id: 0, category: "$_id" } },
          { $sort: { category: 1 } },
        ])
        .toArray();

      // All Classes
      // Pagination
      const page = parseInt(req.query?.page) || 1;
      const limit = parseInt(req.query?.limit) || 6;
      const skip = (page - 1) * limit;

      const allClasses = await classesDB
        .find(query.category && query)
        .limit(limit)
        .skip(skip)
        .toArray();
      res.send({ allCategory, allClasses });
    });

    app.get("/classes-details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classesDB.findOne(query);
      res.send(result);
    });

    app.post("/add-to-carts", VerifyJWT, async (req, res) => {
      const item = req.body;
      const result = await cartsDB.insertOne(item);
      res.send(result);
    });

    // Instructors API
    app.get("/instructors-popular", async (req, res) => {
      const limit = req.query?.limit;
      const query = { popularity: "Popular" };
      const totalPopularInstructors = await instructorsDB.countDocuments(query);
      const popularInstructors = await instructorsDB
        .find(query)
        .limit(limit & limit)
        .sort({ name: 1 })
        .toArray();
      res.send({ totalPopularInstructors, popularInstructors });
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

    app.get("/instructor-details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await instructorsDB.findOne(query);
      res.send(result);
    });

    app.get("/instructor-all-classes", async (req, res) => {
      const email = req.query?.email;
      const query = { email: email };
      const result = await classesDB.find(query).toArray();
      res.send(result);
    });

    // Students API
    app.get("/students-feedback", async (req, res) => {
      const result = await studentsFeedBackDB
        .find()
        .sort({ Date: 1 })
        .toArray();
      res.send(result);
    });

    app.post("/students-feedback", VerifyJWT, async (req, res) => {
      const { feedBack } = req.body;
      const result = await studentsFeedBackDB.insertOne(feedBack);
      res.send(result);
    });

    // Payments API
    app.post("/create-payment-intent", VerifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", VerifyJWT, async (req, res) => {
      const payment = req.body;
      const result = await paymentsDB.insertOne(payment);

      // Enroll
      const id = payment?.courseId;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $addToSet: { enrollEmail: payment?.email },
      };
      const enroll = await classesDB.updateOne(filter, update);

      const availableSeats = await classesDB.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { availableSeats: -1 } }
      );
      res.send(result);
    });

    // DashBoard APIS

    // Admin APIS
    app.get("/isAdmin/:email", VerifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersDB.findOne(query);
      const result = user?.role === "admin";
      res.send(result);
    });

    app.get("/admin-dashboard", VerifyJWT, verifyAdmin, async (req, res) => {
      const totalCourse = await classesDB.estimatedDocumentCount();
      const totalEnroll = await classesDB
        .aggregate([
          { $unwind: "$enrollEmail" },
          {
            $group: {
              _id: null,
              count: {
                $sum: {
                  $cond: [{ $eq: ["$enrollEmail", "$enrollEmail"] }, 1, 0],
                },
              },
            },
          },
        ])
        .toArray();

      const totalProfit = await paymentsDB
        .aggregate([
          {
            $group: {
              _id: null,
              totalSum: { $sum: "$price" },
            },
          },
        ])
        .toArray();

      // Charts Data
      const chartsData = await paymentsDB
        .aggregate([
          {
            $lookup: {
              from: "classes",
              let: { menuItemId: { $toObjectId: "$courseId" } },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$_id", "$$menuItemId"],
                    },
                  },
                },
              ],
              as: "menuItemsData",
            },
          },
          {
            $unwind: "$menuItemsData",
          },
          {
            $group: {
              _id: "$menuItemsData.category",
              quantity: { $sum: 1 },
              revenue: { $sum: "$menuItemsData.price" },
            },
          },
          {
            $project: {
              _id: 0,
              category: "$_id",
              Quantity: "$quantity",
              TotalPrice: "$revenue",
            },
          },
        ])
        .toArray();

      res.send({
        totalCourse,
        totalEnroll: totalEnroll[0].count,
        totalProfit: totalProfit[0].totalSum,
        chartsData,
      });
    });

    app.get("/manage-all-classes", VerifyJWT, verifyAdmin, async (req, res) => {
      const result = await classesDB.find().toArray();
      res.send(result);
    });

    app.delete(
      "/classes-delete/:id",
      VerifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await classesDB.deleteOne(query);
        res.send(result);
      }
    );

    app.get(
      "/manage-all-instructors",
      VerifyJWT,
      verifyAdmin,
      async (req, res) => {
        const result = await instructorsDB.find().toArray();
        res.send(result);
      }
    );

    app.delete(
      "/instructor/delete/:id",
      VerifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const email = req.query.email;

        const query = { email: email };
        const classesDelete = await classesDB.deleteMany(query);
        const result = await instructorsDB.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      }
    );

    // USER DashBoard API
    app.get("/order-status", VerifyJWT, async (req, res) => {
      const email = req.query?.email;

      // All Status
      const allStatus = await paymentsDB
        .aggregate([
          {
            $match: {
              email: email,
            },
          },
          {
            $lookup: {
              from: "payments",
              localField: "email",
              foreignField: "email",
              as: "orders",
            },
          },
          {
            $group: {
              _id: 0,
              totalOrders: { $sum: 1 },
              totalPayments: { $sum: "$price" },
            },
          },
        ])
        .toArray();

      // Find Enroll Course
      const totalEnrollCount = await classesDB
        .aggregate([
          {
            $match: {
              enrollEmail: email,
            },
          },
          {
            $group: {
              _id: null,
              totalScore: { $sum: 1 },
            },
          },
        ])
        .toArray();

      // Find Enroll Course
      const enrollClasses = await classesDB
        .find({ enrollEmail: email })
        .limit(3)
        .toArray();

      res.send({
        allStatus: allStatus[0],
        totalEnrollCount: totalEnrollCount[0],
        enrollClasses,
      });
    });

    app.get("/enroll-classes", VerifyJWT, async (req, res) => {
      const email = req.query.email;
      // Find Enroll Course
      const enrollClasses = await classesDB
        .find({ enrollEmail: email })
        .toArray();
      res.send(enrollClasses);
    });

    // Carts API
    app.get("/my-carts", VerifyJWT, async (req, res) => {
      const email = req.query.email;
      const result = await cartsDB
        .aggregate([
          {
            $match: {
              email: email,
            },
          },
          {
            $addFields: {
              cart_id: { $toObjectId: "$classesId" },
            },
          },
          {
            $lookup: {
              from: "classes",
              localField: "cart_id",
              foreignField: "_id",
              as: "classes",
            },
          },
          {
            $unwind: "$classes",
          },
          {
            $replaceRoot: { newRoot: "$classes" },
          },
        ])
        .toArray();
      res.send(result);
    });

    app.delete("/my-carts/:id", VerifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { classesId: id };
      const result = await cartsDB.deleteOne(query);
      res.send(result);
    });

    // Payments API
    app.get("/payment-history", VerifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await paymentsDB.find(query).toArray();
      res.send(result);
    });

    // Apply Instructor
    app.post("/apply-instructor", VerifyJWT, async (req, res) => {
      const instructor = req.body;
      const query = { email: instructor.email };
      const checkEmail = await applyInstructorsDB.findOne(query);
      if (checkEmail) {
        return res.send({ message: "You Have Already Apply For Instructor" });
      }
      const result = await applyInstructorsDB.insertOne(instructor);
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
