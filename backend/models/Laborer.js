const mongoose = require('mongoose');

const LaborerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dailyWage: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Laborer', LaborerSchema);