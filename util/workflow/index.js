'use strict';

exports = module.exports = function(req, res) {
  var workflow = new (require('events').EventEmitter)();

  workflow.outcome = {
    success: false,
    errfor: {}
  };

  workflow.hasErrors = function() {
    return Object.keys(workflow.outcome.errfor).length !== 0;
  };

  workflow.on('exception', function(err) {
    workflow.outcome.errfor.exception = (err);
    //console.log(workflow.outcome)
    return workflow.emit('response');
  });

  workflow.on('response', function() {
    workflow.outcome.success = !workflow.hasErrors();
    //console.log(workflow.outcome)
    res.send(workflow.outcome);
  });

  return workflow;
};
