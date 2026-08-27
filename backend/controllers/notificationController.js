const Notification = require('../models/Notification');
const Appointment = require('../models/Appointment');
const Expert = require('../models/Expert');
const sendError = require('../utils/sendError');

// To get an appointment's actual start time by combining its date and time fields
const getAppointmentStart = (appointment) => {
  const start = new Date(appointment.date);
  const [hours, minutes] = (appointment.time || '00:00').split(':').map(Number);
  start.setUTCHours(hours || 0, minutes || 0, 0, 0);
  return start;
};

// To create reminder notifications for appointments starting within 24 hours
const createDueReminders = async (user) => {
  let filter;

  if (user.role === 'expert') {
    const expert = await Expert.findOne({ userId: user._id });
    if (!expert) return;
    filter = { expertId: expert._id };
  } else {
    filter = { farmerId: user._id };
  }

  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const candidates = await Appointment.find({
    ...filter,
    status: 'scheduled',
    reminderSent: false,
    date: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), $lte: soon },
  });

  const dueAppointments = candidates.filter((appointment) => {
    const startsAt = getAppointmentStart(appointment);
    return startsAt >= now && startsAt <= soon;
  });

  for (const appointment of dueAppointments) {
    await Notification.create({
      userId: user._id,
      message: `Reminder: your consultation "${appointment.title}" is coming up soon`,
      link: '/consultations',
    });
    appointment.reminderSent = true;
    await appointment.save();
  }
};

// GET /api/notifications
// To get the logged-in user's notifications (also triggers due reminders)
const listNotifications = async (req, res) => {
  try {
    await createDueReminders(req.user);

    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(notifications);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// PUT /api/notifications/:id/read
// To mark a notification as read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    res.json(notification);
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

module.exports = { listNotifications, markAsRead };
