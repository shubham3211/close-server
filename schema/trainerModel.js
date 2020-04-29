"use strict";

exports = module.exports = function(app, mongoose) {
  var trainerSchema = new mongoose.Schema({
    name: { type: String },

    category: [{ type: String }],

    phone: { type: String },

    address: { type: String },

    age: { type: Number },

    sex: { type: String },

    dp: { type: String },

    active: { type: Boolean, default: false },

    sessions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Session" }],

    total_earning: { type: Number },

    otp: { type: String },

    work_slots: [{ type: mongoose.Schema.Types.ObjectId, ref: "Trainerslot" }],

    workplace: { type: mongoose.Schema.Types.ObjectId, ref: "Workplace" },

    created_at: { type: Date, default: Date.now }
  });

  app.db.model("Trainer", trainerSchema);
};
