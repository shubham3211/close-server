"use strict";

exports = module.exports = function(app, mongoose) {
  var slotSchema = new mongoose.Schema({
    date_time: { type: Date },

    created_at: { type: Date, default: Date.now },

    occupancy_left: {
      gold: Number,
      silver: Number,
      platinum: Number,
      pool: Number
    },

    session: [{ type: mongoose.Schema.Types.ObjectId, ref: "Session" }]
  });

  app.db.model("Slot", slotSchema);
};
