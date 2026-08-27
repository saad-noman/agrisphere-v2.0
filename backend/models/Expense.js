const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    crop: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop'},
    category: { type: String },
    amount: { type: Number },
    date: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
