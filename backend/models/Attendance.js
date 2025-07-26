const mongoose = require('mongoose');

module.exports = mongoose.model("Attendance", new mongoose.Schema({
  laborerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Laborer', required: true },
  date: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}));