var jwt = require('jsonwebtoken');
var config = require('../config');
var trainer = {
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
          req.app.db.models.Trainer.findOne({ phone: req.body.phone }, function(err, trainer) {
            if (err) {
              return workflow.emit('exception', err);
            }
    
            else if (trainer) {
              console.log('hola amigo')
              workflow.trainer = trainer
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
            req.app.db.models.Trainer.create(fieldsToSet, function(err, workplace) {
              if (err) {
                return workflow.emit('exception', err);
              }
              workflow.trainer = trainer;
              //req.workplace = workplace;
              console.log('I came here 2')
              workflow.emit('createandsaveotp');
            });
    
        });
    
       workflow.on('createandsaveotp',function () {
          var otpnew = Math.floor(1000 + Math.random() * 9000) 
          console.log(otpnew)
          workflow.trainer.update({otp:otpnew},function (err,acc) {
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
            'Your authentication OTP for DOO.IT is '+otp
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
    
            req.app.db.models.Trainer.findOne({ phone: req.body.phone}, function(err, trainer) {
    
            if (err) {
              return workflow.emit('exception',err);
            }
    
            if (!trainer){
              console.log("i did not found the account")
              workflow.outcome.errfor.username = 'account not found';
              return workflow.emit('response');
            }  
            workflow.trainer = trainer;
            workflow.emit('verifyotp')
            
          })
        });
    
        workflow.on('verifyotp',function () {     // make this hash secure
          if (workflow.trainer.otp === req.body.otp){
            return workflow.emit('logUserIn')
          }
          else{
            return workflow.emit('exception','otp not valid')
          }
        })
    
         workflow.on('logUserIn', function() {
          var token = jwt.sign({phone:req.body.phone}, config.secret, {
                expiresIn: 10080000000 // in seconds
              });
    
            workflow.outcome.token = token;
            workflow.outcome.active = workflow.trainer.active;
            //workflow.outcome.referalstatus = workflow.account.referal.referalused;
            workflow.emit('clearotp');
        });
    
         workflow.on('clearotp',function () {
           workflow.trainer.update({otp:''},function (err,account) {
             if (err){
              return workflow.emit('exception','something went wrong')
             }
             workflow.emit('response')
           })
         })
        workflow.emit('validate');
      },
      firstlogin:function (req,res) {
        var workflow = req.app.utility.workflow(req, res);
        console.log(req.body)
        workflow.on('findWorkplace',function () {
          req.app.db.models.Workplace.find({uid:req.body.centercode},function (err,wplace) {
              if (err){
                  return workflow.emit('exception',err)
              }
              if(!wplace){
                return workflow.emit('exception',"wrong center code")
              }
              workflow.workplace = wplace
              workflow.emit('updateAccount')
          })
      })

        workflow.on('updateAccount',function () {
          req.trainer.update({
            name:req.body.name,
            email:req.body.email,
            workplace:workflow.workplace.id,
            active:true
          },function (err,acc) {
            if (err){
              return workflow.emit('exception',err)
            }
            console.log("i came here")
            workflow.emit('response')
          })
        })

        workflow.emit('findWorkplace')
      },

	addtrainer : function (req,res) {
		var workflow = req.app.utility.workflow(req, res);
        
        workflow.on('validate', function() {

            if (!req.body.phone) {
              workflow.outcome.errfor.username = 'phone number required';
            }
            else if (!/^[0-9]+$/.test(req.body.phone)) {
              workflow.outcome.errfor.username = 'only use numbers';
            }
             if (!req.body.name){
                workflow.outcome.errfor.name = 'name required';
             }
      
            if (workflow.hasErrors()) {
              return workflow.emit('response');
            }
            console.log('I came here')
            workflow.emit('duplicateUserCheck');
          });

            workflow.on('duplicateUserCheck',function () {
                req.app.db.models.Trainer.find({phone:req.body.phone},function (err,trainer) {
                    if (err){
                        return workflow.emit('exception',err)
                    }
                    if (trainer.length!=0){
                        console.log(trainer)
                        return workflow.emit('exception',"duplicate trainer")
                    }
                   return workflow.emit('createTrainer')
                }) 
            });

            workflow.on('createTrainer', function() {
                var fieldsToSet = {

                    name:req.body.name,
                  phone: req.body.phone,
                  workplace:req.body.workplace
                };
                req.app.db.models.Trainer.create(fieldsToSet, function(err, trainer) {
                  if (err) {
                    return workflow.emit('exception', err);
                  }
                  workflow.trainer = trainer
                  console.log('I came here 2')
                  workflow.emit('updateWorkplace');
                });
        
            });
            workflow.on('updateWorkplace',function () {
                req.app.db.models.Workplace.findByIdAndUpdate({"_id":req.body.workplace},{$push:{trainers:workflow.trainer.id}},function (err,wp) {
                    if (err){
                        return workflow.emit('exception',err)
                    }
                    workflow.emit('response')
                })
            })
            workflow.emit('validate')
    },

    getaccountdetails:function (req,res) {
      var workflow = req.app.utility.workflow(req, res);
      var fieldsToSet = {
        name : req.trainer.name,
        email : req.trainer.email,
        phone : req.trainer.phone
      }
      workflow.outcome.trainer = fieldsToSet
      workflow.emit('response')
    },

    fetchslots:function (req,res) {
        var workflow = req.app.utility.workflow(req, res);
        //sconsole.log(req.body.date+24)
        req.app.db.models.Trainerslot.find({
          "date_time": { 
          $gte: req.body.sdate,
          $lt: req.body.edate
        } ,
        trainer_status:"active",
        trainer_id:req.trainer.id
      },function (err,tslots) {
        if (err){
            return workflow.emit('exception',err)
          }
          console.log(tslots)
          workflow.outcome.slots = tslots
          //workflow.outcome.count = tslots.length
          workflow.emit('response')
      })
      },

      upcomingbookings:function (req,res) {
        var workflow = req.app.utility.workflow(req, res);
        req.app.db.models.Session.find({trainer_allotted:req.trainer.id,status:"upcoming",timeslot:{$gte:req.body.sdate}},function (err,sess) {
          if (err){
            return workflow.emit('exception',err)
          }
          workflow.outcome.sessions = sess
          return workflow.emit('response')
        }).populate('account workplace','name id phone address')
      },
      pastbookings:function (req,res) {
        var workflow = req.app.utility.workflow(req, res);
        req.app.db.models.Session.find({trainer_allotted:req.trainer.id,status:"completed"},function (err,sess) {
          if (err){
            return workflow.emit('exception',err)
          }
          workflow.outcome.sessions = sess
          return workflow.emit('response')
        }).populate('account workplace','name id phone address')
      },
    workslot_manage:function (req,res) {
        var workflow = req.app.utility.workflow(req, res);
        
        //req.body = JSON.parse(req.body)
        //console.log(req.body)
        timeslotsinp = JSON.parse(req.body.timestamp)
        //console.log(timeslotsinp)
        workflow.on('validate',function () {
            if (!req.body.timestamp) {
                workflow.outcome.errfor.timestamp = 'time slot required';
              }
        
              if (workflow.hasErrors()) {
                return workflow.emit('response');
              }
              //console.log('I came here')
              workflow.emit('createTimeSlots');
        })
        // workflow.on('validateTrainer',function () {
        //     req.app.db.models.Trainer.findById(req.body.trainerid,function (err,trainer) {
        //         if (err){
        //             return workflow.emit('exception',err)
        //         }
        //         if (!trainer){
        //             return workflow.emit('exception',"trainer not found")   
        //         }
        //        console.log("i visited here")
        //             //console.log(trainer)
        //             workflow.trainer = trainer
        //             return workflow.emit("createTimeSlots")
        //     }).populate('workplace')
        // })
        workflow.on('createTimeSlots',async function () {
            timeslots = timeslotsinp
            var i=0
           await timeslots.forEach(async function (element) {
               i++;
                element['trainer_id'] = req.trainer.id;
                element['workplace'] = req.trainer.workplace
                console.log(element)
               await req.app.db.models.Trainerslot.update({"date_time":element.date_time,"trainer_id":req.trainer.id},{$set:element},{upsert: true},async function (err,tslot) {
                    if (err){
                        console.log(err)
                        return workflow.emit('exception',err)
                    }
                    
                    // if (tslot.upserted){
                    //     console.log(tslot.upserted[0]._id)
                    //     workflow.trainer.update({$push:{work_slots:tslot.upserted[0]._id}},function (err,trainer) {
                    //         if (err){
                    //             console.log(err)
                    //         }
                    //     })
                    // }
                    //console.log(tslot) 
            })
               
                
            });
            console.log(i)
            if (i==timeslots.length)
            workflow.emit('response')
        })  
        workflow.emit('validate')
    }
	
}
module.exports = trainer;