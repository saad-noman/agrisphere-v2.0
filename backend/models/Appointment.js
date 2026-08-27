const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    consultationRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsultationRequest' },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expert' },
    title: { type: String },
    date: { type: Date },
    time: { type: String },
    consultationType: { type: String, enum: ['online', 'offline'] },
    meetingLink: { type: String },
    location: { type: String },
    reminderSent: { type: Boolean, default: false },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
