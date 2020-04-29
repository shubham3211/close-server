'use strict';

exports = module.exports = function(app, mongoose) {
  var orderSchema = new mongoose.Schema({

    productid:{type:String},

    date:{type:Date,default:Date.now},

    //dateofdelivery:{type:Date,default:Date.now},

    name:{type:String},

    address:{type:String},

    phone:{type:String},

    quantity:{type:Number},

    total_cost:{type:Number},

    paymentmethod:{type:String,default:'COD'}



  })

  app.db.model('Order', orderSchema);
};