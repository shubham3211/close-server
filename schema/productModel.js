'use strict';

exports = module.exports = function(app, mongoose) {
  var productSchema = new mongoose.Schema({

    uid:{type:String,default:''},

    image:{type:String},

    cost:{type:Number}

    
  });

  app.db.model('Product', productSchema);
};