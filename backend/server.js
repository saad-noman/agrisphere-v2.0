require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const multer = require('multer');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const expertRoutes = require('./routes/expertRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const diseaseRoutes = require('./routes/diseaseRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const farmingRecommendationRoutes = require('./routes/farmingRecommendationRoute');
const notificationRoutes = require('./routes/notificationRoutes');
const farmingExpertiseRoutes = require('./routes/farmingExpertiseRoutes');
const cropRoutes = require('./routes/cropRoutes');
const productionRoutes = require('./routes/productionRoutes');
const fertilizerRoutes = require('./routes/fertilizerRoutes');
const fertilizerRecordRoutes = require('./routes/fertilizerRecordRoutes');
const pesticideRoutes = require('./routes/pesticideRoutes');
const pesticideRecordRoutes = require('./routes/pesticideRecordRoutes');
const financialAnalysisRoutes = require('./routes/financialAnalysisRoutes');
const farmRoutes = require('./routes/farmRoutes');
const activityTimelineRoutes = require('./routes/activityTimelineRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const cropAnalysisRoutes = require('./routes/cropAnalysisRoutes');
const messageRoutes = require('./routes/messageRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const pricePlanRoutes = require('./routes/pricePlanRoutes');
const communityRoutes = require('./routes/communityRoutes');
const statsRoutes = require('./routes/statsRoutes');

const app = express();

// To allow the configured CLIENT_URL plus any localhost dev port
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (origin === process.env.CLIENT_URL) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
};

app.use(cors({
  origin: (origin, callback) => {
    callback(null, isAllowedOrigin(origin));
  },
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/experts', expertRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/diseases', diseaseRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/farming-recommendation', farmingRecommendationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/farming-expertise', farmingExpertiseRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/fertilizers', fertilizerRoutes);
app.use('/api/fertilizer-records', fertilizerRecordRoutes);
app.use('/api/pesticides', pesticideRoutes);
app.use('/api/pesticide-records', pesticideRecordRoutes);
app.use('/api/financial-analysis', financialAnalysisRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/activity-timeline', activityTimelineRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/crop-analysis', cropAnalysisRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/price-plans', pricePlanRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/stats', statsRoutes);

// Turns upload failures into clear client errors instead of generic 500s
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'Each image must be 5 MB or smaller',
      LIMIT_FILE_COUNT: 'Too many images uploaded',
      LIMIT_UNEXPECTED_FILE: 'Too many images uploaded',
    };
    return res.status(400).json({ message: messages[err.code] || 'Upload failed' });
  }
  if (err && err.message === 'Only image files are allowed') {
    return res.status(400).json({ message: err.message });
  }
  return next(err);
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB — server was not started.', err);
    process.exit(1);
  });

