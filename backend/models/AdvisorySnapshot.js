const mongoose = require('mongoose');

/**
 * A saved Crop Intelligence advisory.
 *
 * Two things are stored together on purpose:
 *  - `kind: 'advisory'` is a point-in-time record the farmer chose to keep, so
 *    they can look back at what was warned and when. The full payload is kept
 *    verbatim rather than regenerated, because the value of the record is that
 *    it shows what the advice actually said on that date.
 *  - `kind: 'watch'` is a field the farmer is tracking. Only the inputs are
 *    stored; the advisory is regenerated from live weather each time the
 *    watchlist is opened, so a watched field is never stale.
 */
const advisorySnapshotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    kind: {
      type: String,
      enum: ['advisory', 'watch'],
      default: 'advisory',
      index: true,
    },

    // Farmer's own label for the field, e.g. "North plot by the road"
    fieldName: {
      type: String,
      trim: true,
      maxlength: 120,
    },

    // Optional link to an existing crop record, so the two features join up
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
    },

    // --- Inputs, enough to regenerate the advisory at any time -------------
    divisionId: { type: String, required: true },
    districtId: { type: String, required: true },
    upazilaId: { type: String, default: null },
    cropId: { type: String, required: true },
    sowingDate: { type: Date, required: true },
    areaValue: { type: Number, min: 0 },
    areaUnit: { type: String, trim: true },

    // --- Snapshot of the result at save time (advisory records only) ------
    status: {
      type: String,
      enum: ['good', 'watch', 'warning', 'critical'],
    },
    actionCount: { type: Number, default: 0 },

    // Which data the snapshot was built from, kept so a saved advisory can
    // never be mistaken later for a live one.
    dataMode: {
      type: String,
      enum: ['live', 'cached', 'demo'],
      default: 'live',
    },

    // Full advisory payload as generated. Schema-less by design: the engine's
    // output shape can evolve without a migration, and old records stay
    // readable exactly as they were written.
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

advisorySnapshotSchema.index({ user: 1, kind: 1, createdAt: -1 });

module.exports = mongoose.model('AdvisorySnapshot', advisorySnapshotSchema);
