const mongoose = require('mongoose');

const consultationRecordSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expert' },
    diagnosis: { type: String },
    recommendations: { type: String },
    notes: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ConsultationRecord', consultationRecordSchema);
