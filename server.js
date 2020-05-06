const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const shortid = require("shortid");
const cors = require("cors");
const mongoose = require("mongoose");
var mongo = require("mongodb");
var moment = require("moment");
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost/exercise-track");

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//application
var Schema = mongoose.Schema;
const user = new Schema({
  username: { type: String, required: true, unique: true },
  _id: { type: String, default: shortid.generate },
  exercise: [
    {
      description: String,
      duration: Number,
      date: Date
    }
  ]
});
const User = mongoose.model("User", user);
//schema end

//controllers
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.post("/api/exercise/new-user", (req, res, next) => {
  const user = new User(req.body);
  user.save((err, savedUser) => {
    if (err) {
      if (err.code == 11000) {
        return next("username not available try another");
      } else {
        return next(err);
      }
    }
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  });
});

app.post("/api/exercise/add", (req, res) => {
  let input = req.body;
  if (!input.userId || !input.description || !input.duration) {
    res.send("invalid input");
  } else if (!input.date) {
    input.date = new Date();
  }
  let date = new Date(input.date).toDateString();
  let duration = parseInt(input.duration);

  let exer = {
    description: input.description,
    duration: duration,
    date: date
  };
  User.findByIdAndUpdate(
    input.userId,
    { $push: { exercise: exer } },
    (err, doc) => {
      if (err) return console.log(err);
      res.json({
        username: doc.username,
        description: exer.description,
        duration: exer.duration,
        _id: doc._id,
        date: exer.date
      });
    }
  );
});

app.get("/api/exercise/log", (req, res) => {
  let userId = req.query.userId;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  if (!from && !to) {
    User.findById(userId, (err, doc) => {
      if (err) return console.log(err);
      if (!doc) {
        res.send("Invalid UserId");
      } else {
        let exercise = doc.exercise;
        exercise = exercise.slice(
          0,
          limit <= exercise.length ? limit : exercise.length
        );
        res.json({
          _id: userId,
          username: doc.username,
          count: exercise.length,
          log: exercise
        });
      }
    });
  } else {
    User.find()
      .where("_id")
      .equals(userId)
      .where("exercise.date")
      .gt(from)
      .lt(to)
      .exec((err, doc) => {
        if (err) return console.log("Error: ", err);
        if (doc.length == 0) {
          res.send("not a valid date range");
        } else {
          let exercise = doc[0].exercise;
          exercise = exercise.slice(
            0,
            limit <= exercise.length ? limit : exercise.length
          );
          res.json({
            _id: userId,
            username: doc.username,
            count: exercise.length,
            log: exercise
          });
        }
      });
  }
});

app.get("/api/exercise/users", (req, res, next) => {
  User.find({}, (err, data) => {
    res.json(data);
  });
});

app.get("/remove", (req, res) => {
  User.remove({}, (err, doc) => {
    if (err) console.log(err);
    res.json(doc);
  });
});

//controller end

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
