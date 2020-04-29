var jwt = require('jsonwebtoken');
var config = require('../config');
var sendVerificationEmail = function(req, res, options) {
  req.app.utility.sendmail(req, res, {
    from: req.app.config.smtp.from.name +' <'+ req.app.config.smtp.from.address +'>',
    to: options.email,
    subject: 'Verify Your '+ req.app.config.projectName +' Account',
    textPath: 'account/verification/email-text',
    htmlPath: 'account/verification/email-html',
    locals: {
      verifyURL: req.protocol +'://'+ req.headers.host +'/api/account/verification?token=' + options.verificationToken + '&userID=' + req.user.id,
      projectName: req.app.config.projectName
    },
    success: function() {
      options.onSuccess();
    },
    error: function(err) {
      options.onError(err);
    }
  });
};

var security = {
  signup: function(req, res){
    var workflow = req.app.utility.workflow(req, res);
    console.log(req.body)
    workflow.on('validate', function() {

      if (!req.body.phone) {
        workflow.outcome.errfor.username = 'username required';
      }
      else if (!/^[0-9]+$/.test(req.body.phone)) {
        workflow.outcome.errfor.username = 'only use numbers';
      }

      if (workflow.hasErrors()) {
        return workflow.emit('response');
      }
      console.log('I came here')
      workflow.emit('duplicateUserCheck');
    });

   workflow.on('duplicateUserCheck', function() {
      req.app.db.models.Account.findOne({ phone: req.body.phone }, function(err, account) {
        if (err) {
          return workflow.emit('exception', err);
        }

        else if (account) {
          console.log('hola amigo')
          workflow.account = account
          return workflow.emit('createandsaveotp');
        }
        else
        console.log('I came here 1')
        return workflow.emit('createUser');
      });
    });

  

   workflow.on('createUser', function() {
        var fieldsToSet = {
          phone: req.body.phone
        };
        req.app.db.models.Account.create(fieldsToSet, function(err, account) {
          if (err) {
            return workflow.emit('exception', err);
          }
          workflow.account = account;
          req.account = account;
          console.log('I came here 2')
          workflow.emit('generatereferal');
        });

    });

    workflow.on('generatereferal',function () {
    var fieldsToSet = {
      referalid:req.account.phone,

    referalaccount:req.account.id,

    referalamount:0
    };
     req.app.db.models.Referal.create(fieldsToSet, function(err, referal) {
          if (err) {
            return workflow.emit('exception', err);
          }
          workflow.referal = referal;
          //req.account = account;
          console.log('I came here 2')
          workflow.emit('linkreftouser');
        });
   })

   workflow.on('linkreftouser',function () {
     req.account.update({referal:workflow.referal.id},function (err,acc) {
       if (err){
        return workflow.emit('exception',err)
       }
       workflow.emit('createandsaveotp')
     })
   })

   workflow.on('createandsaveotp',function () {
      var otpnew = Math.floor(1000 + Math.random() * 9000) 
      console.log(otpnew)
      workflow.account.update({otp:otpnew},function (err,acc) {
        if (err){
          return workflow.emit('exception',err)
        }
        workflow.emit('sendotp',otpnew)
        //workflow.emit('response')
      })
    })



   workflow.on('sendotp',function (otp) {
     let plivo = require('plivo');
      let client = new plivo.Client('SAMDFIMJRIN2Q0NTE5OG','ZWI5ODcyNWQ1NWU2Y2ZlMDU1ZjBmZjE0ZmE0NDZi');
      phone = '+91'+req.body.phone;
      client.messages.create(
        'LDOOIT',
        phone,
        'Your authentication OTP for DOO.it is '+otp
      ).then(function(message_created) {
        workflow.emit('response')
      });
   })

  


    workflow.emit('validate');
  },

   login: function(req, res){
    var workflow = req.app.utility.workflow(req, res);
    console.log(req.body)
    workflow.on('validate', function() {
      if (!req.body.otp) {
        workflow.outcome.errfor.otp = 'otp required';
      }
      if (!req.body.phone) {
        workflow.outcome.errfor.phone = 'phone number required';
      }
      if (workflow.hasErrors()) {
        return workflow.emit('response');
      }


      workflow.emit('attemptLogin');
    });

    

    workflow.on('attemptLogin', function() {

        req.app.db.models.Account.findOne({ phone: req.body.phone}, function(err, account) {

        if (err) {
          return workflow.emit('exception',err);
        }

        if (!account){
          console.log("i did not found the account")
          workflow.outcome.errfor.username = 'account not found';
          return workflow.emit('response');
        }  
        workflow.account = account;
        workflow.emit('verifyotp')
        
      }).populate('referal')
    });

    workflow.on('verifyotp',function () {     // make this hash secure
      if (workflow.account.otp === req.body.otp){
        return workflow.emit('logUserIn')
      }
      else{
        return workflow.emit('exception','otp not valid')
      }
    })

     workflow.on('logUserIn', function() {
      var token = jwt.sign({phone:req.body.phone}, config.secret, {
            expiresIn: 100800000000 // in seconds
          });

        workflow.outcome.token = token;
        workflow.outcome.active = workflow.account.active;
        workflow.outcome.referalstatus = workflow.account.referal.referalused;
        workflow.emit('clearotp');
    });

     workflow.on('clearotp',function () {
       workflow.account.update({otp:''},function (err,account) {
         if (err){
          return workflow.emit('exception','something went wrong')
         }
         workflow.emit('response')
       })
     })

    workflow.emit('validate');
  },

  resendotp:function (req,res) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function() {
      if (!req.body.phone) {
        workflow.outcome.errfor.phone = 'phone number required';
      }
      if (workflow.hasErrors()) {
        return workflow.emit('response');
      }


      workflow.emit('createandsaveotp');
    });

    workflow.on('createandsaveotp',function () {
      var otpnew = Math.floor(100000 + Math.random() * 900000) 
      console.log(otpnew)
      req.app.db.models.Account.findOneAndUpdate({phone:req.body.phone},{otp:otpnew},function (err,acc) {
        if (err){
          return workflow.emit('exception',err)
        }
        workflow.emit('sendotp',otpnew)
        //workflow.emit('response')
      })
    })



   workflow.on('sendotp',function (otp) {
     let plivo = require('plivo');
      let client = new plivo.Client('MAMJI2MZGXOWQ2NTDHOG','YmZlN2EwOGNhODJhZWZjNTI0OTRmYWVkY2EzYTNm');
      phone = '+91'+req.body.phone;
      client.messages.create(
        'SEHATC',
        phone,
        'Your authentication OTP for Buyo is '+otp
      ).then(function(message_created) {
        workflow.emit('response')
      });
   })

   workflow.emit('validate')

  }

   
};

module.exports = security;
