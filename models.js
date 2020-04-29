exports = module.exports = function(app, mongoose) {
  require('./schema/accountModel')(app, mongoose);
  require('./schema/productModel')(app, mongoose);
  require('./schema/slotModel')(app, mongoose);
  require('./schema/sessionModel')(app, mongoose);
  require('./schema/trainerModel')(app, mongoose);
  require('./schema/trainerslotModel')(app, mongoose);
  require('./schema/orderModel')(app, mongoose);
  require('./schema/pastlocationModel')(app, mongoose);
  require('./schema/userpackageModel')(app, mongoose);
  require('./schema/workplaceModel')(app, mongoose);
};