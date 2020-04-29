"use strict";

exports = module.exports = function(app, mongoose) {
  var sessionSchema = new mongoose.Schema({
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },

    trainer_allotted: { type: mongoose.Schema.Types.ObjectId, ref: "Trainer" },

    workplace: { type: mongoose.Schema.Types.ObjectId, ref: "Workplace" },

    user_package: { type: mongoose.Schema.Types.ObjectId, ref: "Userpackage" },

    slot: { type: mongoose.Schema.Types.ObjectId, ref: "Trainerslot" },

    timeslot: { type: Date },

    session_type: { type: String },

    workout_type: { type: String },

    created_at: { type: Date, default: Date.now },

    status: { type: String }
  });

  app.db.model("Session", sessionSchema);
};
