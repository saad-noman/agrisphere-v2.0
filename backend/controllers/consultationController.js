const ConsultationRequest = require('../models/ConsultationRequest');
const Appointment = require('../models/Appointment');
const ConsultationRecord = require('../models/ConsultationRecord');
const Expert = require('../models/Expert');
const Notification = require('../models/Notification');
const sendError = require('../utils/sendError');

// Saves a notification for one user
function notify(userId, message, link) {
  return Notification.create({ userId, message, link });
}

// POST /api/consultations/requests
// To submit a consultation request to an expert
const createRequest = async (req, res) => {
  try {
    const expertId = req.body.expertId;
    const title = req.body.title;
    const cropType = req.body.cropType;
    const subject = req.body.subject;
    const description = req.body.description;
    const consultationType = req.body.consultationType;
    const preferredDate = req.body.preferredDate;

    if (!expertId || !title || !consultationType) {
      return res.status(400).json({ message: 'Expert, title, and consultation mode are required' });
    }

    // Optional fields are left undefined so the model defaults apply
    let attachment = undefined;
    if (req.file) {
      attachment = `/uploads/${req.file.filename}`;
    }

    let requestedDate = undefined;
    if (preferredDate) {
      requestedDate = preferredDate;
    }

    const request = await ConsultationRequest.create({
      farmerId: req.user._id,
      expertId,
      title,
      cropType,
      subject,
      description,
      consultationType,
      preferredDate: requestedDate,
      attachment,
    });

    // Tell the expert a new request is waiting
    const expert = await Expert.findById(expertId);
    if (expert && expert.userId) {
      await notify(expert.userId, `New consultation request: ${title}`, '/consultations/pending');
    }

    res.status(201).json(request);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// GET /api/consultations/requests/mine
// To get the logged-in farmer's own consultation requests
const getMyRequests = async (req, res) => {
  try {
    const requests = await ConsultationRequest.find({ farmerId: req.user._id })
      .populate('expertId', 'fullName specialization phone email')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// GET /api/consultations/requests/pending
// To get the logged-in expert's pending consultation requests
const getPendingRequests = async (req, res) => {
  try {
    const expert = await Expert.findOne({ userId: req.user._id });
    if (!expert) {
      return res.json([]);
    }

    const requests = await ConsultationRequest.find({ expertId: expert._id, status: 'pending' })
      .populate('farmerId', 'name phone email district upazila')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// PUT /api/consultations/requests/:id/approve
// To approve a consultation request and schedule the appointment
const approveRequest = async (req, res) => {
  try {
    const request = await ConsultationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const expert = await Expert.findOne({ userId: req.user._id });
    if (!expert || request.expertId.toString() !== expert._id.toString()) {
      return res.status(403).json({ message: 'You can only approve your own requests' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'This request has already been handled' });
    }

    const date = req.body.date;
    const time = req.body.time;
    const meetingLink = req.body.meetingLink;
    const location = req.body.location;

    if (!date || !time) {
      return res.status(400).json({ message: 'Date and time are required to approve a request' });
    }

    request.status = 'approved';
    await request.save();

    const appointment = await Appointment.create({
      consultationRequestId: request._id,
      farmerId: request.farmerId,
      expertId: request.expertId,
      title: request.title,
      date,
      time,
      consultationType: request.consultationType,
      meetingLink,
      location,
    });

    await notify(request.farmerId, `Your consultation request "${request.title}" was approved and scheduled`, '/consultations');

    res.json({ request, appointment });
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// PUT /api/consultations/requests/:id/reject
// To reject a consultation request
const rejectRequest = async (req, res) => {
  try {
    const request = await ConsultationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const expert = await Expert.findOne({ userId: req.user._id });
    if (!expert || request.expertId.toString() !== expert._id.toString()) {
      return res.status(403).json({ message: 'You can only reject your own requests' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'This request has already been handled' });
    }

    request.status = 'rejected';
    await request.save();

    await notify(request.farmerId, `Your consultation request "${request.title}" was rejected`, '/consultations');

    res.json(request);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// PUT /api/consultations/requests/:id/reschedule
// To let an expert suggest a different date/time for a request
const rescheduleRequest = async (req, res) => {
  try {
    const request = await ConsultationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const expert = await Expert.findOne({ userId: req.user._id });
    if (!expert || request.expertId.toString() !== expert._id.toString()) {
      return res.status(403).json({ message: 'You can only reschedule your own requests' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'This request has already been handled' });
    }

    const preferredDate = req.body.preferredDate;

    if (!preferredDate) {
      return res.status(400).json({ message: 'A new date and time are required to suggest a reschedule' });
    }

    request.status = 'rescheduled';
    request.preferredDate = preferredDate;
    await request.save();

    await notify(request.farmerId, `A new time was suggested for "${request.title}"`, '/consultations');

    res.json(request);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// PUT /api/consultations/requests/:id/accept-reschedule
// To let a farmer accept the expert's suggested reschedule and book the appointment
const acceptReschedule = async (req, res) => {
  try {
    const request = await ConsultationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.farmerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only respond to your own requests' });
    }

    if (request.status !== 'rescheduled') {
      return res.status(400).json({ message: 'This request has no pending reschedule to accept' });
    }

    const date = req.body.date;
    const time = req.body.time;

    if (!date || !time) {
      return res.status(400).json({ message: 'Date and time are required to accept a reschedule' });
    }

    request.status = 'approved';
    await request.save();

    const appointment = await Appointment.create({
      consultationRequestId: request._id,
      farmerId: request.farmerId,
      expertId: request.expertId,
      title: request.title,
      date,
      time,
      consultationType: request.consultationType,
    });

    const expert = await Expert.findById(request.expertId);
    if (expert && expert.userId) {
      await notify(expert.userId, `${req.user.name} accepted the new time for "${request.title}"`, '/consultations/records');
    }

    res.json({ request, appointment });
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// GET /api/consultations/appointments/mine
// To get the logged-in user's appointments (farmer's own, or an expert's given ones)
const getMyAppointments = async (req, res) => {
  try {
    // Experts see the appointments they give, farmers see their own
    let filter;

    if (req.user.role === 'expert') {
      const expert = await Expert.findOne({ userId: req.user._id });

      let expertId = null;
      if (expert) {
        expertId = expert._id;
      }

      filter = { expertId };
    } else {
      filter = { farmerId: req.user._id };
    }

    const appointments = await Appointment.find(filter)
      .populate('farmerId', 'name phone email')
      .populate('expertId', 'fullName phone email')
      .sort({ date: -1 });

    // Load the saved record (if any) that belongs to each appointment
    const appointmentIds = [];
    for (let i = 0; i < appointments.length; i++) {
      appointmentIds.push(appointments[i]._id);
    }

    const records = await ConsultationRecord.find({
      appointmentId: { $in: appointmentIds },
    });

    const result = [];
    for (let i = 0; i < appointments.length; i++) {
      const appointment = appointments[i];

      let matchingRecord = null;
      for (let j = 0; j < records.length; j++) {
        if (records[j].appointmentId.toString() === appointment._id.toString()) {
          matchingRecord = records[j];
          break;
        }
      }

      const appointmentData = appointment.toObject();
      appointmentData.record = matchingRecord;
      result.push(appointmentData);
    }

    res.json(result);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// PUT /api/consultations/appointments/:id/complete
// To mark an appointment completed and save the consultation record
const completeAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const expert = await Expert.findOne({ userId: req.user._id });
    if (!expert || appointment.expertId.toString() !== expert._id.toString()) {
      return res.status(403).json({ message: 'You can only complete your own appointments' });
    }

    if (appointment.status !== 'scheduled') {
      return res.status(400).json({ message: 'This appointment has already been completed or cancelled' });
    }

    const diagnosis = req.body.diagnosis;
    const recommendations = req.body.recommendations;
    const notes = req.body.notes;

    appointment.status = 'completed';
    await appointment.save();

    const record = await ConsultationRecord.findOneAndUpdate(
      { appointmentId: appointment._id },
      {
        appointmentId: appointment._id,
        farmerId: appointment.farmerId,
        expertId: appointment.expertId,
        diagnosis,
        recommendations,
        notes,
        completedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    await notify(appointment.farmerId, `Your consultation "${appointment.title}" has been completed`, '/consultations');

    res.json({ appointment, record });
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getPendingRequests,
  approveRequest,
  rejectRequest,
  rescheduleRequest,
  acceptReschedule,
  getMyAppointments,
  completeAppointment,
};
