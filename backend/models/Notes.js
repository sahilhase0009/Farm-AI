const mongoose = require('mongoose');

const NotesSchema = new mongoose.Schema({
  content: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model("Notes", NotesSchema);