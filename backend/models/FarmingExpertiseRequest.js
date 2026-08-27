const mongoose = require('mongoose');

const farmingExpertiseRequestSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cropName: {
      type: String,
      required: true,
      trim: true,
    },
    comment: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'answered'],
      default: 'pending',
    },
    response: {
      expert: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      expertName: {
        type: String,
      },
      description: {
        type: String,
      },
      attachment: {
        type: String, // URL/path to stock image or uploaded file
      },
      attachmentType: {
        type: String, // 'stock_image', 'upload_image', 'upload_pdf'
      },
      answeredAt: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FarmingExpertiseRequest', farmingExpertiseRequestSchema);
