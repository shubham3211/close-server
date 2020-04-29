"use strict";

exports = module.exports = function(app, mongoose) {
  var trainerslotSchema = new mongoose.Schema({
    date_time: { type: Date },

    created_at: { type: Date, default: Date.now },

    session_type: [String],

    group_session: Boolean,

    group_activity: String,

    trainer_status: String,

    trainer_id: { type: mongoose.Schema.Types.ObjectId, ref: "Trainer" },

    workplace: { type: mongoose.Schema.Types.ObjectId, ref: "Workplace" }
  });

  app.db.model("Trainerslot", trainerslotSchema);
};
