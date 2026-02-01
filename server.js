const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (HTML, CSS, JS)
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Setup SQLite database
const db = new sqlite3.Database("applications.db", (err) => {
  if (err) console.error(err.message);
  else console.log("Connected to SQLite database.");
});

// Create table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT,
    email TEXT,
    phone TEXT,
    gender TEXT,
    dob TEXT,
    qualification TEXT,
    specialisation TEXT,
    university TEXT,
    experience INTEGER,
    skills TEXT,
    resume TEXT,
    coverletter TEXT,
    declaration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Setup file upload using Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Save file with timestamp + original extension
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// -------- Routes --------

// Form submission
app.post("/submit", upload.single("resume"), (req, res) => {
  const {
    fullname, email, phone, gender, dob,
    qualification, specialisation, university,
    experience, coverletter, declaration
  } = req.body;

  const skills = req.body.skills 
    ? Array.isArray(req.body.skills) ? req.body.skills.join(", ") : req.body.skills
    : "";

  const resumeFile = req.file ? req.file.filename : "";

  db.run(
    `INSERT INTO applications
     (fullname, email, phone, gender, dob, qualification, specialisation, university, experience, skills, resume, coverletter, declaration)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [fullname, email, phone, gender, dob, qualification, specialisation, university, experience, skills, resumeFile, coverletter, declaration ? 1 : 0],
    function(err) {
      if (err) {
        console.error(err.message);
        res.status(500).send("Error saving application.");
      } else {
        res.send(`
          <h2>Application Submitted Successfully!</h2>
          <p>Thank you, ${fullname}, for applying.</p>
          <a href="/form.html">Submit another application</a>
        `);
      }
    }
  );
});

// Optional: Admin page to view submissions
app.get("/admin", (req, res) => {
  db.all("SELECT * FROM applications ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).send("Error fetching applications.");
    }

    let tableRows = rows.map(row => `
      <tr>
        <td>${row.id}</td>
        <td>${row.fullname}</td>
        <td>${row.email}</td>
        <td>${row.phone}</td>
        <td>${row.gender}</td>
        <td>${row.dob}</td>
        <td>${row.qualification}</td>
        <td>${row.specialisation || "-"}</td>
        <td>${row.university || "-"}</td>
        <td>${row.experience || 0}</td>
        <td>${row.skills || "-"}</td>
        <td>${row.resume ? `<a href="/uploads/${row.resume}" target="_blank">Download</a>` : "-"}</td>
        <td>${row.coverletter || "-"}</td>
        <td>${row.declaration ? "Yes" : "No"}</td>
        <td>${row.created_at}</td>
      </tr>
    `).join("");

    res.send(`
      <h2>Submitted Applications</h2>
      <table border="1" cellpadding="5" cellspacing="0">
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Gender</th>
            <th>DOB</th><th>Qualification</th><th>Specialisation</th><th>University</th>
            <th>Experience</th><th>Skills</th><th>Resume</th><th>Cover Letter</th>
            <th>Declaration</th><th>Submitted At</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <br>
      <a href="/form.html">Back to Form</a>
    `);
  });
});

// Make uploads folder public so files can be downloaded
app.use("/uploads", express.static("uploads"));

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
