'use strict';

exports = module.exports = function(app, mongoose) {
  var pastlocationSchema = new mongoose.Schema({

    accountid:{type:mongoose.Schema.Types.ObjectId, ref: 'Account'},

    addressline:{type:String},

    pincode:{type:String}

  })

  app.db.model('Pastlocation', pastlocationSchema);
};