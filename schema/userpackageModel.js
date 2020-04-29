"use strict";

exports = module.exports = function(app, mongoose) {
  var userpackageSchema = new mongoose.Schema({
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },

    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },

    status: { type: String },

    package_type: { type: String },

    session_left: { type: Number },

    workplace: { type: mongoose.Schema.Types.ObjectId, ref: "Workplace" },

    created_at: { type: Date, default: Date.now }
  });

  app.db.model("Userpackage", userpackageSchema);
};
