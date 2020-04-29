"use strict";

exports = module.exports = function(app, mongoose) {
  var workplaceSchema = new mongoose.Schema({
    uid: { type: String },

    packages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Package" }],

    sessions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Session" }],

    selected_packages: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Package" }
    ],

    unpaid_packages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Package" }],

    active_userlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Account" }],

    visited_userlist: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Account" }
    ],

    trainers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Trainer" }],

    total_earning: { type: Number },

    phone: { type: String },

    address: { type: String },

    name: { type: String },

    active: { type: Boolean, default: false },

    owner_name: { type: String },

    city: { type: String },

    otp: { type: String }
  });

  app.db.model("Workplace", workplaceSchema);
};
