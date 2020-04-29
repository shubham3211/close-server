var jwt = require('jsonwebtoken');
var config = require('./config');
var security = require('./service/security');
var account = require('./service/account');
var admin = require('./service/admin')
var trainer = require('./service/trainer')
var workplace = require('./service/workplace')
const http = require('http')
http.post = require('http-post');

/*function apiEnsureVerifiedAccount(req, res, next){
  if(!req.app.config.requireAccountVerification){
    return next();
  }
  req.user.isVerified(function(err, flag){
    if(err){
      return next(err);
    }
    if(flag){
      return next();
    }else{
      return res.status(401).send({errors: ['verification required']});
    }
  });
}*/

function apiEnsureAuthenticated(req, res, next){ 		// this is meant for token authentication
  if(req.isAuthenticated()){
    return next();
  }
  res.set('X-Auth-Required', 'true');
  //no need to store the originalUrl in session: caller knows the return url
  //req.session.returnUrl = req.originalUrl;
  res.status(401).send({errors: ['authentication required']});
}

function secureRoutes(req,res,next){
	if(!req.app.config.requireJWTToken){
    return next();
  }
	var workflow = req.app.utility.workflow(req, res);
	var token = req.headers.token;
	if (token){
		jwt.verify(token,config.secret,function (err,decode) {		//change secret for JWT and bycrypt
			if (err){
				return workflow.emit('exception', 'Invalid JWT token');
			}
			else{
        console.log("im here boy")
				req.app.db.models.Account.findOne({ phone: decode.phone }, function(err, account) {
        		if (err) {
          		return workflow.emit('exception', err);
        		}

            if (!account){
              console.log('hello')
              workflow.outcome.errfor.token = 'invalid user token';
              return workflow.emit('response')
            }

        		if (account) {
              console.log('why not')
          		req.account = account;			// attaching the final user to the request
                  //console.log("this is the current user"+user);
          		//console.log(req.account)
              next();

        		}
        
     		 })
        .populate('referal')

			}
		})
	}
	else{
		return workflow.emit('exception', 'Please send a JWT token');
	}
}

function wsecureRoutes(req,res,next){
	if(!req.app.config.requireJWTToken){
    return next();
  }
	var workflow = req.app.utility.workflow(req, res);
	var token = req.headers.token;
	if (token){
		jwt.verify(token,config.secret,function (err,decode) {		//change secret for JWT and bycrypt
			if (err){
				return workflow.emit('exception', 'Invalid JWT token');
			}
			else{
        console.log("im here boy")
				req.app.db.models.Workplace.findOne({ phone: decode.phone }, function(err, workplace) {
        		if (err) {
          		return workflow.emit('exception', err);
        		}

            if (!workplace){
              console.log('hello')
              workflow.outcome.errfor.token = 'invalid user token';
              return workflow.emit('response')
            }

        		if (workplace) {
              console.log('why not')
          		req.workplace = workplace;			// attaching the final user to the request
                  //console.log("this is the current user"+user);
          		//console.log(req.account)
              next();

        		}
        
     		 })
        .populate('packages')

			}
		})
	}
	else{
		return workflow.emit('exception', 'Please send a JWT token');
	}
}
function tsecureRoutes(req,res,next){
	if(!req.app.config.requireJWTToken){
    return next();
  }
	var workflow = req.app.utility.workflow(req, res);
	var token = req.headers.token;
	if (token){
		jwt.verify(token,config.secret,function (err,decode) {		//change secret for JWT and bycrypt
			if (err){
				return workflow.emit('exception', 'Invalid JWT token');
			}
			else{
        console.log("im here boy")
				req.app.db.models.Trainer.findOne({ phone: decode.phone }, function(err, trainer) {
        		if (err) {
          		return workflow.emit('exception', err);
        		}

            if (!trainer){
              console.log('hello')
              workflow.outcome.errfor.token = 'invalid user token';
              return workflow.emit('response')
            }

        		if (trainer) {
              console.log('why not')
          		req.trainer = trainer;			// attaching the final user to the request
                  //console.log("this is the current user"+user);
          		//console.log(req.account)
              next();

        		}
     		 })
			}
		})
	}
	else{
		return workflow.emit('exception', 'Please send a JWT token');
	}
}

exports = module.exports = function(app) {
  
	
    
  //app.use(account.test1)
  app.get('/',function (req,res) {
    res.sendFile('index.html')
  })


  app.post('/test', account.neworder)


  app.post('/api/signup', security.signup);

  //app.all('/api/login*',apiEnsureVerifiedAccount);
  app.post('/api/login',security.login);
  app.post('/api/resendotp',security.resendotp)
  
  

  

  /***************Account APIs************************/

  app.all('/api/account*',secureRoutes)
  app.post('/api/account/firstlogin',account.firstlogin)
  app.get('/api/account/getcities',account.getdistinctcities)
  app.get('/api/account/getcenters',account.getworkplacelist)
  app.post('/api/account/getpackages',account.fetchpackages)
  app.post('/api/account/selectpackage',account.optpackage)
  app.post('/api/account/getfreeslots',account.fetchfreeslots)
  app.post('/api/account/bookslot',account.bookfreeslot)
  app.post('/api/account/getupcomingsessions',account.upcomingsessions)
  app.post('/api/account/getupcompletedsessions',account.completedsessions)
  app.post('/api/account/cancelsession',account.cancelsession)
  app.post('/api/account/getactivepackages',account.fetchactivepackages)
  app.post('/api/account/getinactivepackages',account.fetchinactivepackages)
  app.get('/api/account/getaccountdetails',account.getAccountDetails)
  app.post('/api/account/updateaccount',account.updateAccount)

  /***************trainer APIs******************/
  app.post('/tapi/signup', trainer.signup);
  app.post('/tapi/login',trainer.login);
  app.all('/api/trainer*',tsecureRoutes)
 
   app.post('/api/trainer/firstlogin',trainer.firstlogin)
   app.post('/api/trainer/getslots',trainer.fetchslots)
   app.get('/api/trainer/getaccountdetails',trainer.getaccountdetails)
   app.post('/api/trainer/upcomingsessions',trainer.upcomingbookings)
   app.get('/api/trainer/completedsessions',trainer.pastbookings)
   app.post('/api/trainer/manageworkslot',trainer.workslot_manage)
 
  //app.post('/api/createtrainer',trainer.addtrainer) 
 // app.post('/api/managetrainerslot',trainer.workslot_manage)

   /*************** workplace APIs******************/
   app.post('/wapi/signup', workplace.signup);
   app.post('/wapi/login',workplace.login);
   app.all('/api/workplace*',wsecureRoutes)
 
   app.post('/api/workplace/firstlogin',workplace.firstlogin)
   app.get('/api/workplace/gettrainers',workplace.fetchtrainerlist)
   app.post('/api/workplace/updatetrainercategory',workplace.updatetrainertegory)
   app.get('/api/workplace/upcomingsessions',workplace.fetchupcomingsessions)
   app.get('/api/workplace/pastsessions',workplace.fetchpastsessions)
   app.get('/api/workplace/unpaidpackages',workplace.fetchunpaidpackages)
   app.get('/api/workplace/paidpackages',workplace.fetchpaidpackages)
   app.post('/api/workplace/paymentdone',workplace.paymentcompleted)
   app.post('/api/workplace/getpackages',workplace.fetchpackages)
   app.post('/api/workplace/updaterates',workplace.updaterates)
   app.post('/api/workplace/updateaccount',workplace.updateAccount)
   app.get('/api/workplace/getaccountdetails',workplace.getaccountdetails)
   

   app.get('/test',workplace.test)

};




