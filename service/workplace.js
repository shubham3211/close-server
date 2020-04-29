var jwt = require('jsonwebtoken');
var config = require('../config');
var workplace = {

  test:function (req,res) {
    var workflow = req.app.utility.workflow(req, res);
    var testing = require('../test.json')
    console.log(testing)
    workflow.emit('response')
    testing.forEach(element => {
      element['workplace'] = req.workplace.id
      req.app.db.models.Package.create(element,function (err,pack) {
        if (err){
          return workflow.emit('exception',err)
        }
      })
    });
  },

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
      req.app.db.models.Workplace.findOne({ phone: req.body.phone }, function(err, workplace) {
        if (err) {
          return workflow.emit('exception', err);
        }

        else if (workplace) {
          console.log('hola amigo')
          workflow.workplace = workplace
          return workflow.emit('createandsaveotp');
        }
        else
        console.log('I came here 1')
        return workflow.emit('generateUID');
      });
    });

    workflow.on('generateUID',function () {
      req.app.db.models.Workplace.count({},function (err,count) {
        if (err){
          return workflow.emit('exception',err)
        }
        var uid = 100+count;
        return workflow.emit('createUser',uid)
      })
    })

  

   workflow.on('createUser', function(uid) {
        var fieldsToSet = {
          phone: req.body.phone,
          uid:uid
        };
        req.app.db.models.Workplace.create(fieldsToSet, function(err, workplace) {
          if (err) {
            return workflow.emit('exception', err);
          }
          workflow.workplace = workplace;
          //req.workplace = workplace;
          console.log('I came here 2')
          workflow.emit('createDummyPackages');
        });

    });

    workflow.on('createDummyPackages',async function () {
      var packages = require('../test.json')
      var i=0
     await packages.forEach(async function (element) {
         i++;
         // element['trainer_id'] = req.body.trainerid;
          element['workplace'] = workflow.workplace.id
          console.log(element)
         await req.app.db.models.Package.create(element,async function (err,tslot) {
              if (err){
                  console.log(err)
                  return workflow.emit('exception',err)
              }
        })          
      });
      //console.log(i)
      if (i==packages.length)
      workflow.emit('createandsaveotp')
  })
  

    
   workflow.on('createandsaveotp',function () {
      var otpnew = Math.floor(1000 + Math.random() * 9000) 
      console.log(otpnew)
      workflow.workplace.update({otp:otpnew},function (err,acc) {
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

        req.app.db.models.Workplace.findOne({ phone: req.body.phone}, function(err, workplace) {

        if (err) {
          return workflow.emit('exception',err);
        }

        if (!workplace){
          console.log("i did not found the account")
          workflow.outcome.errfor.username = 'account not found';
          return workflow.emit('response');
        }  
        workflow.workplace = workplace;
        workflow.emit('verifyotp')
        
      })
    });

    workflow.on('verifyotp',function () {     // make this hash secure
      if (workflow.workplace.otp === req.body.otp){
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
        workflow.outcome.active = workflow.workplace.active;
        //workflow.outcome.referalstatus = workflow.account.referal.referalused;
        workflow.emit('clearotp');
    });

     workflow.on('clearotp',function () {
       workflow.workplace.update({otp:''},function (err,account) {
         if (err){
          return workflow.emit('exception','something went wrong')
         }
         workflow.emit('response')
       })
     })
    workflow.emit('validate');
  },
  getaccountdetails:function (req,res) {
    var workflow = req.app.utility.workflow(req, res);
    var fieldsToSet = {
      name : req.workplace.name,
      email : req.workplace.email,
      phone : req.workplace.phone,
      uid: req.workplace.uid,
      address: req.workplace.address,
      city:req.workplace.city
    }
    workflow.outcome.workplace = fieldsToSet
    workflow.emit('response')
  },
  firstlogin:function (req,res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('updateAccount',function () {
      req.workplace.update({
        name:req.body.name,
        email:req.body.email,
        owner_name:req.body.oname,
        city:req.body.city,
        address:req.body.address,
        active:true
      },function (err,acc) {
        if (err){
          return workflow.emit('exception',err)
        }
        console.log("i came here")
        workflow.emit('response')
      })
    })
    workflow.emit('updateAccount')
  },

  updateAccount:function (req,res) {
    var workflow = req.app.utility.workflow(req, res);
    var fieldsToSet = {
      name:req.body.name,
      email:req.body.email,
      address:req.body.address
    }
    req.workplace.update(fieldsToSet,function (err,acc) {
      if (err){
        return workflow.emit("exception",err)
      }
      workflow.emit('response')
    })
  },

  updatetrainertegory:function (req,res) {
    var workflow = req.app.utility.workflow(req, res);
    req.app.db.models.Trainer.findByIdAndUpdate(req.body.trainerid,{$set:{category:req.body.category.split(",")}},function (err,trainer) {
      if (err){
        return workflow.emit('exception',err)
      }
      return workflow.emit('response')
    })
  },

  fetchtrainerlist:function (req,res) {
    var workflow = req.app.utility.workflow(req, res);
    req.app.db.models.Trainer.find({workplace:req.workplace.id},'id name phone category',function (err,trainer) {
      if (err){
        return workflow.emit('exception',err)
      }
      workflow.outcome.trainers = trainer
      workflow.emit('response')
    })
  },


  createpackage:function (req,res) {
    var workflow = req.app.utility.workflow(req, res);
    var fieldsToSet = {
    workplace:req.body.workplace,

    total_cost:req.body.cost,

    total_sessions:req.body.sessions,

    discount:req.body.discount,

    category:req.body.category,

    ptype:req.body.ptype,

    docoins:req.body.docoins
    }
    req.app.db.models.Package.create(fieldsToSet,function (err,pack) {
      if (err){
        return workflow.emit('exception',err)
      }
      workflow.emit('response')
    })
  },

  fetchunpaidpackages:function (req,res) {
    var workflow = req.app.utility.workflow(req, res);
    console.log(req.workplace.name)
    req.app.db.models.Userpackage.find({workplace:req.workplace.id,status:"unpaid"},function (err,upack) {
      if (err){
        return workflow.emit('exception',err)
      }
      workflow.outcome.userpacks = upack;
      workflow.emit('response')
    }).populate('account package','name id total_sessions total_cost discount phone' )
  },

  fetchupcomingsessions:function (req,res) {
    var workflow = req.app.utility.workflow(req, res);
    req.app.db.models.Session.find({workplace:req.workplace.id,status:"upcoming"},'trainer_allotted workplace slot status created_at account',function (err,sess) {
      if (err){
        return workflow.emit('exception',err)
      }
      workflow.outcome.sessions = sess
      return workflow.emit('response')
    }).populate('workplace trainer_allotted slot account','name phone date_time address id')
  },

  fetchpastsessions:function (req,res) {
    var workflow = req.app.utility.workflow(req, res);
    req.app.db.models.Session.find({workplace:req.workplace.id,status:"completed"},'workplace slot status created_at account',function (err,sess) {
      if (err){
        return workflow.emit('exception',err)
      }
      workflow.outcome.sessions = sess
      return workflow.emit('response')
    }).populate('workplace slot account','name phone date_time address id')
  },

  paymentcompleted:function (req,res) {
    var workflow = req.app.utility.workflow(req, res);
    console.log(req.body.upackid)
    req.app.db.models.Userpackage.findByIdAndUpdate(req.body.upackid,{status:"active"},function (err,upack) {
      if (err){
        return workflow.emit('exception',err)
      }
      console.log(upack)
      //workflow.outcome.userpacks = upack;
      workflow.emit('response')
    })
  },

  fetchpaidpackages:function (req,res) {
    var workflow = req.app.utility.workflow(req, res);
    req.app.db.models.Userpackage.find({workplace:req.workplace.id,status:"active"},function (err,upack) {
      if (err){
        return workflow.emit('exception',err)
      }
      workflow.outcome.userpacks = upack;
      workflow.emit('response')
    }).populate('account package','name id total_sessions total_cost discount phone' )    
  },

  

  fetchpackages:function (req,res) {
    var workflow = req.app.utility.workflow(req, res);
    req.app.db.models.Package.find({workplace:req.workplace.id,ptype:"standard",category:req.body.category},function (err,pack) {
      if (err){
        return workflow.emit('exception',err)
      }
      workflow.outcome.packages = pack;
      return workflow.emit('response')
    })  
  },

  updaterates:async function (req,res) {
    var i=0;
    packs = JSON.parse(req.body.packages)
    var workflow = req.app.utility.workflow(req, res);  
    await packs.forEach(async function (element) {
      i++;
      // element['trainer_id'] = req.body.trainerid;
       //element['workplace'] = workflow.workplace.id
       console.log(element._id)
      await req.app.db.models.Package.findByIdAndUpdate(element._id,{total_cost:element.total_cost},async function (err,tslot) {
           if (err){
               console.log(err)
               return workflow.emit('exception',err)
           }
     })          
   });
   //console.log(i)
   if (i==packs.length)
   workflow.emit('response')
  },

	addworkplace : function (req,res) {
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
                req.app.db.models.Workplace.find({phone:req.body.phone},function (err,workplace) {
                    if (err){
                        return workflow.emit('exception',err)
                    }
                    if (workplace.length!=0){
                        console.log(workplace)
                        return workflow.emit('exception',"duplicate workplace")
                    }
                   return workflow.emit('createWorkplace')
                }) 
            });

            workflow.on('createWorkplace', function() {
                var fieldsToSet = {
                    name:req.body.name,
                  phone: req.body.phone,
                  address:req.body.address,
                  city:req.body.city
                };
                req.app.db.models.Workplace.create(fieldsToSet, function(err, trainer) {
                  if (err) {
                    return workflow.emit('exception', err);
                  }
                  console.log('I came here 2')
                  workflow.emit('response');
                });
        
            });
            workflow.emit('validate')
    },
    
	
}
module.exports = workplace;