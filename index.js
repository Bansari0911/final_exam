const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const multer = require("multer");
const upload = multer();
require("dotenv").config();

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  const model = {
    isSearched: false,
    editor: {
      carvin: "",
      carmake: "",
      carmodel: "",
      carmileage: "",
    },
    cars: [],
  };

  res.render("index", { model: model });
});

app.post("/", (req, res) => {
  const body = req.body;

  const model = {
    isSearched: true,
    editor: body,
    cars: [],
  };

  let query = `SELECT * FROM car`;
  const segments = [];
  Object.keys(req.body).forEach((key) => {
    if (key === "carvin" && !!req.body[key]) {
      segments.push(`carvin = ${req.body[key]}`);
    }
    if (key === "carmake" && !!req.body[key]) {
      segments.push(`carmake LIKE '${req.body[key].trim()}%'`);
    }
    if (key === "carmodel" && !!req.body[key]) {
      segments.push(`carmodel LIKE '${req.body[key].trim()}%'`);
    }
    if (key === "carmileage" && !!req.body[key]) {
      segments.push(`carmileage::numeric <= ${req.body[key]}`);
    }
  });

  if (segments.length) {
    query = query + " WHERE " + segments.join(" AND ");
  }

  pool.query(query).then((data) => {
    model.cars = data.rows;
    res.render("index", { model: model });
  });
});

const port = process.env.PORT || 3000;

pool
  .connect()
  .then(() => {
    console.log("Connected to db...");
    app.listen(port, () => {
      console.log(`Server started on port ${port}`);
    });
  })
  .catch((error) => console.log(error));
