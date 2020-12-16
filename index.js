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
  res.render("index");
});

app.get("/sumofseries", (req, res) => {
  const model = {
    editor: {
      start: "",
      end: "",
      increment: "",
    },
    result: null,
    error: null,
  };

  res.render("sumOfSeries", { model: model });
});

app.post("/sumofseries", (req, res) => {
  const body = req.body;

  const model = {
    editor: body,
    result: null,
    error: null,
  };

  if (!body.start || !body.end || !body.increment) {
    model.error = "Input can not be empty!";
  }

  if (Number(body.start) > Number(body.end)) {
    model.error = "Ending number must be less than starting number.";
  }

  if (!model.error) {
    model.result = calculateSum(
      Number(body.start),
      Number(body.end),
      Number(body.increment)
    );
  }

  res.render("sumOfSeries", { model: model });
});

function calculateSum(start, end, inc) {
  let sum = 0;
  for (let i = start; i <= end; i = i + inc) {
    sum = sum + i;
  }
  return sum;
}

app.get("/import", (req, res) => {
  const model = {
    totalRecords: 0,
  };

  pool
    .query("SELECT * FROM book")
    .then((data) => {
      model.totalRecords = data.rowCount;
      res.render("import", { model: model });
    })
    .catch((err) => console.log(err));
});

app.post("/import", upload.single("filename"), async (req, res) => {
  if (!req.file || Object.keys(req.file).length === 0) {
    message = "Error: Import file not uploaded";
    return res.send(message);
  }

  let initialRecords = 0;

  try {
      const result = await pool.query('SELECT * FROM book');
      initialRecords = result.rowCount;
  } catch(error) {
      console.log(error);
  }

  const buffer = req.file.buffer;
  const lines = buffer.toString().split(/\r?\n/);
  const success = [];
  const errors = [];

  for (let line of lines) {
    const book = line.split(",");
    const sql = `
			INSERT INTO book
			(book_id, title, total_pages, rating, isbn, published_date)
			VALUES (${getValFromFile(book[0])}, '${getValFromFile(
      book[1]
    )}', '${getValFromFile(book[2])}', '${getValFromFile(
      book[3]
    )}', '${getValFromFile(book[4])}', '${getValFromFile(book[5])}')`;

    try {
      const result = await pool.query(sql);
      success.push(`Inserted successfully`);
    } catch (error) {
      errors.push(`Book ID: ${book[0]} - ${error.message}`);
    }
  }

  pool.query('SELECT * FROM book').then(data => {
    res.status(200).json({
      initial: initialRecords,
      processed: lines.length,
      succeed: success.length,
      failed: errors.length,
      errors: errors,
    });
  }).catch(err => console.log(err));
});

function getValFromFile (val) {
    if(val === 'Null') {
        return undefined;
    }
    return val;
}

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
