"use strict";

exports = module.exports = function(app, mongoose) {
  var accountSchema = new mongoose.Schema({
    phone: { type: String },

    email: { type: String, default: "" },

    name: { type: String, default: "" },

    address: { type: String, default: "" }
  });

  app.db.model("Account", accountSchema);
};
