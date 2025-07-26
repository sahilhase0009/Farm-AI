require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); // Required for serving files
const { GoogleGenerativeAI } = require("@google/generative-ai");

const authMiddleware = require('./middleware/authMiddleware');
const Laborer = require('./models/Laborer');
const Attendance = require('./models/Attendance');
const Notes = require('./models/Notes');

const app = express();

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

mongoose.connect(process.env.MONGO_URI).then(() => console.log("MongoDB Connected !!"));

// --- API Routes ---
app.use('/api/auth', require('./routes/auth'));

// Protected Laborer Routes
app.get('/api/laborers', authMiddleware, async (req, res) => {
  res.json(await Laborer.find({ userId: req.user.id }));
});

app.post('/api/laborers', authMiddleware, async (req, res) => {
  const { name, dailyWage } = req.body;
  const laborer = await Laborer.create({ name, dailyWage, userId: req.user.id });
  res.status(201).json(laborer);
});

app.delete('/api/laborers/:id', authMiddleware, async (req, res) => {
    const laborer = await Laborer.findOne({ _id: req.params.id, userId: req.user.id });
    if (!laborer) return res.status(404).json({ msg: 'Laborer not found' });
    await laborer.deleteOne();
    await Attendance.deleteMany({ laborerId: req.params.id });
    res.json({ msg: 'Laborer deleted' });
});

// Protected Attendance Route
app.post('/api/attendance', authMiddleware, async (req, res) => {
  const records = req.body.ids.map(id => ({
    laborerId: id,
    date: req.body.date,
    userId: req.user.id
  }));
  await Attendance.insertMany(records);
  res.json({ status: 'Saved' });
});

// Protected Notes Routes
app.post('/api/notes', authMiddleware, async (req, res) => {
    await Notes.findOneAndUpdate(
        { userId: req.user.id },
        { content: req.body.note, userId: req.user.id },
        { upsert: true, new: true }
    );
    res.json({ status: 'Note Saved' });
});

app.get('/api/notes/latest', authMiddleware, async (req, res) => {
    const note = await Notes.findOne({ userId: req.user.id });
    res.json(note || { content: '' });
});

// Protected AI Analysis Route
app.post('/api/ai/analyze', authMiddleware, async (req, res) => {
  const { note } = req.body;
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
  const prompt = `Based on the following farm note, provide a short, practical, and actionable suggestion for a farmer. Note: "${note}"`;
  const result = await model.generateContent(prompt);
  const response = await result.response;
  res.json({ response: response.text() });
});

// Protected Salary Report Route
app.get('/api/salary', authMiddleware, async (req, res) => {
  const laborers = await Laborer.find({ userId: req.user.id });
  const report = [];
  for (const lab of laborers) {
    const count = await Attendance.countDocuments({ laborerId: lab._id });
    report.push({
      name: lab.name,
      daysWorked: count,
      salary: count * (lab.dailyWage || 0)
    });
  }
  res.json(report);
});


// ✅ START: SERVE FRONTEND STATIC FILES
// This new section will serve your website's files
app.use(express.static(path.join(__dirname, '../frontend')));

// For any route that is not an API route, send the main index.html file.
// The script in index.html will handle redirecting to the login page if needed.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});
// ✅ END: SERVE FRONTEND STATIC FILES


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
