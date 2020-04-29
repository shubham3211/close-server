"use strict";
var fs = require("fs");
//var s3fs = require("s3fs");
//var aws = require("aws-sdk");
var multer = require("multer");
var multerS3 = require("multer-s3");
var path = require("path");
var awsConfig = require("aws-config");
var config = require("../config");
var sync = require("sync");
var async = require("async");
var ObjectId = require("mongodb").ObjectID;
var intersection = require("array-intersection");
var intersect = require("intersect");
var include = require("array-includes");
var fs = require("fs");
var http = require("http");
//var promise = require('promise');

var sendVerificationEmail = function(req, res, userID, options) {
  req.app.utility.sendmail(req, res, {
    from:
      req.app.config.smtp.from.name +
      " <" +
      req.app.config.smtp.from.address +
      ">",
    to: options.email,
    subject: "Verify Your " + req.app.config.projectName + " Account",
    textPath: "account/verification/email-text",
    htmlPath: "account/verification/email-html",
    locals: {
      verifyURL:
        req.protocol +
        "://" +
        req.headers.host +
        "/api/account/verification?token=" +
        options.verificationToken +
        "&userID=" +
        userID,
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

// public api
var account = {
  updateaccountDetails: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var fieldsToSet = {
      name: req.body.name,

      email: req.body.email
    };
    req.account.update(fieldsToSet, function(err, account) {
      if (err) {
        return workflow.emit("exception", err);
      }
      workflow.emit("response");
    });
  },

  neworder: function(req, res) {
    let body = "";
    console.log(req.body);
    console.log("the login cookie is " + req.cookies.login);
    http.post(
      "http://localhost:3000/test1",
      { cookie: req.cookies.login, ip: req.ip },
      function(res1) {
        res1.setEncoding("utf8");
        res1.on("data", function(chunk) {
          body += chunk;
          //console.log(chunk)
        });
        res1.on("end", () => {
          try {
            let json = JSON.parse(body);

            console.log(json);
            var fieldsToSet = {
              productid: req.body.id,

              quantity: 1,

              total_cost: 1200
            };

            req.app.db.models.Order.create(fieldsToSet, function(err, order) {
              if (err) {
                console.log(err);
                res.send(500);
              } else {
                res.render("index", {
                  name: json.name,
                  user: json.user,
                  address: json.address,
                  email: json.email
                });
              }
            });
            // do something with JSON
          } catch (error) {
            console.log("there was an error");
            res.redirect("/");
          }
        });
        //res.redirect('/')
      }
    );
  },

  firstlogin: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on("updateAccount", function() {
      req.account.update(
        {
          name: req.body.name,
          email: req.body.email,
          active: true
        },
        function(err, acc) {
          if (err) {
            return workflow.emit("exception", err);
          }
          console.log("i came here");
          workflow.emit("findreferal");
        }
      );
    });
    workflow.on("findreferal", function() {
      var refind = false;
      req.app.db.models.Referal.findOne(
        { referalid: req.body.referalid },
        function(err, ref) {
          console.log("im here b");
          console.log(ref);
          if (err) {
            console.log("hellosdoss");
            return workflow.emit("exception", "Invalid Referal Code");
          } else if (!ref) {
            console.log("helloos");
            return workflow.emit("addvaluetouser", refind);
          } else if (ref.referalid == req.account.referal.referalid) {
            console.log("hellooss");
            return workflow.emit("addvaluetouser", refind);
          }
          console.log("why this");
          ref.update({ $inc: { referalamount: 100 } }, function(err, res) {
            if (err) {
              return workflow.emit("addvaluetouser", refind);
            }
            refind = true;
            workflow.emit("addvaluetouser", refind);
          });
        }
      );
    });
    workflow.on("addvaluetouser", function(refind) {
      console.log("hello");
      if (refind) {
        req.app.db.models.Referal.findOneAndUpdate(
          { referalid: req.account.referal.referalid },
          { $inc: { referalamount: 150 }, referalused: true },
          function(err, ref) {
            if (err) {
              workflow.outcome.referalstatus = false;
              return workflow.emit("response");
            }
            workflow.outcome.referalstatus = true;
            workflow.emit("response");
          }
        );
      } else {
        workflow.outcome.referalstatus = false;
        workflow.emit("response");
      }
    });
    workflow.emit("updateAccount");
  },

  getdistinctcities: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    req.app.db.models.Workplace.distinct("city", function(err, cities) {
      if (err) {
        return workflow.emit("exception", err);
      }
      workflow.outcome.cities = cities;
      workflow.emit("response");
    });
  },

  getworkplacelist: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    console.log(req.query);
    req.app.db.models.Workplace.find(
      { city: req.query.city },
      "id name phone city address",
      function(err, workp) {
        if (err) {
          return workflow.emit("exception", err);
        }
        workflow.outcome.centers = workp;
        return workflow.emit("response");
      }
    );
  },

  fetchpackages: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    console.log(req.body);
    req.app.db.models.Package.find(
      {
        workplace: req.body.workplaceid,
        category: req.body.category,
        ptype: req.body.ptype
      },
      function(err, pack) {
        if (err) {
          return workflow.emit("exception", err);
        }
        console.log(pack);
        workflow.outcome.packages = pack;
        return workflow.emit("response");
      }
    );
  },

  optpackage: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on("findPackage", function() {
      req.app.db.models.Package.findOne({ _id: req.body.packageid }, function(
        err,
        pack
      ) {
        console.log(req.body.packageid);
        if (err) {
          return workflow.emit("exception");
        }
        if (!pack) {
          console.log(pack);
          return workflow.emit("exception", "package not found");
        }
        workflow.package = pack;
        if (
          workflow.package.ptype === "docoins" &&
          req.account.referal.referalamount >= workflow.package.docoins
        ) {
          return workflow.emit("updateref");
        } else {
          return workflow.emit("createUserPack", "unpaid");
        }
      });
    });

    workflow.on("updateref", function() {
      req.app.db.models.Referal.findOneAndUpdate(
        { _id: req.account.referal.id },
        {
          referalamount:
            req.account.referal.referalamount - workflow.package.docoins
        },
        function(err, ref) {
          if (err) {
            return workflow.emit("exception", err);
          }
          return workflow.emit("createUserPack", "active");
        }
      );
    });

    workflow.on("createUserPack", function(stat) {
      var fieldsToSet = {
        account: req.account.id,

        package: workflow.package.id,

        status: stat,

        package_type: workflow.package.category,

        workplace: workflow.package.workplace,

        session_left: workflow.package.total_sessions
      };
      req.app.db.models.Userpackage.create(fieldsToSet, function(err, upack) {
        if (err) {
          return workflow.emit("exception", err);
        }
        workflow.userpackage = upack;
        return workflow.emit("response");
      });
    });
    workflow.emit("findPackage");

    //  workflow.on('updateuser',function () {
    //    workflow.account.update({$push:{packages:workflow.userpackage.id}},function (err,acc) {
    //      if (err){
    //        return workflow.emit('exception',err)
    //      }
    //      return workflow.emit('response')
    //    })
    //  })
  },

  fetchfreeslots: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    //sconsole.log(req.body.date+24)
    req.app.db.models.Trainerslot.find({
      date_time: {
        $gte: req.body.sdate,
        $lt: req.body.edate
      },
      trainer_status: "active",
      session_type: { $in: [req.body.sessiontype] },
      workplace: req.body.workplaceid
    }).distinct("date_time", function(err, tslots) {
      if (err) {
        return workflow.emit("exception", err);
      }
      console.log(tslots);
      workflow.outcome.freeslots = tslots;
      workflow.outcome.count = tslots.length;
      workflow.emit("response");
    });
  },

  bookfreeslot: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on("validateSlot", function() {
      req.app.db.models.Trainerslot.find(
        {
          date_time: req.body.timeslot,
          trainer_status: "active",
          session_type: { $in: [req.body.sessiontype] },
          workplace: req.body.workplaceid
        },
        function(err, freeslots) {
          if (err) {
            return workflow.emit("exception", err);
          }
          if (freeslots.length == 0) {
            return workflow.emit("exception", "slot not free");
          }
          console.log(freeslots);
          workflow.freeslots = freeslots;
          workflow.emit("checkpackage");
        }
      );
    });

    workflow.on("checkpackage", function() {
      req.app.db.models.Userpackage.findOne(
        {
          account: req.account.id,
          package_type: req.body.sessiontype,
          status: "active",
          session_left: { $gt: 0 }
        },
        function(err, upack) {
          if (err) {
            return workflow.emit("exception", err);
          }
          if (!upack) {
            console.log(upack);
            return workflow.emit("exception", "Package not subscribed");
          }
          console.log(upack);
          workflow.upackage = upack;
          workflow.emit("slotselect");
        }
      );
    });

    workflow.on("slotselect", function() {
      var slotnumber = Math.floor(Math.random() * workflow.freeslots.length);
      workflow.slotnumber = slotnumber;
      req.app.db.models.Trainerslot.findOneAndUpdate(
        {
          date_time: workflow.freeslots[slotnumber].date_time,
          trainer_id: workflow.freeslots[slotnumber].trainer_id
        },
        req.body.sessiontype === "group"
          ? { trainer_status: "active" }
          : { trainer_status: "inactive" },
        function(err, tslots) {
          if (err) {
            return workflow.emit("exception", err);
          }
          workflow.emit("createSession");
        }
      );
    });

    workflow.on("createSession", function() {
      var fieldsToSet = {
        account: req.account.id,

        trainer_allotted: workflow.freeslots[workflow.slotnumber].trainer_id,

        workplace: workflow.freeslots[workflow.slotnumber].workplace,

        slot: workflow.freeslots[workflow.slotnumber].id,

        timeslot: workflow.freeslots[workflow.slotnumber].date_time,

        user_package: workflow.upackage.id,

        session_type: workflow.upackage.package_type,

        workout_type: req.body.worktype,

        status: "upcoming"
      };
      req.app.db.models.Session.create(fieldsToSet, function(err, session) {
        if (err) {
          return workplace.emit("response");
        }
        workflow.session = session;
        workflow.emit("updateUserPackage");
      });
    });
    // workflow.on('updateAccount',function () {
    //   workflow.account.update({$push:{sessions:workflow.session.id}},function (err,acc) {
    //     if (err){
    //       return workflow.emit('exception',err)
    //     }
    //   })
    //   workflow.emit('updateTrainer')
    // })

    // workflow.on('updateTrainer',function () {
    //   req.app.db.models.Trainer.findByIdAndUpdate(workflow.freeslots[workflow.slotnumber].trainer_id,{$push:{sessions:workflow.session.id}},function (err,trainer) {
    //     if (err){
    //       return workflow.emit('exception',err)
    //     }
    //     workflow.emit('updateWorkouts')
    //   })
    // })
    // workflow.on('updateWorkouts',function () {
    //   req.app.db.models.Workplace.findByIdAndUpdate(workflow.freeslots[workflow.slotnumber].workplace,{$push:{sessions:workflow.session.id}},function (err,workplace) {
    //     if (err){
    //       return workflow.emit('exception',err)
    //     }
    //     workflow.emit('updateUserPackage')
    //   })
    // })
    workflow.on("updateUserPackage", function() {
      workflow.upackage.update(
        workflow.upackage.session_left - 1 == 0
          ? {
              status: "completed",
              session_left: workflow.upackage.session_left - 1
            }
          : { session_left: workflow.upackage.session_left - 1 },
        function(err, upack) {
          if (err) {
            return workflow.emit("exception", err);
          }
          workflow.emit("response");
        }
      );
    });
    workflow.emit("validateSlot");
  },

  cancelsession: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on("findsession", function() {
      req.app.db.models.Session.findOne({ _id: req.body.sessionid }, function(
        err,
        sess
      ) {
        if (err) {
          return workflow.emit("exception", err);
        }
        if (!sess) {
          return workflow.emit("exception", "not a valid session");
        }
        workflow.session = sess;
        workflow.emit("updatesession");
      });
    });

    workflow.on("updatesession", function() {
      workflow.session.update({ status: "cancelled" }, function(err, sess) {
        if (err) {
          return workflow.emit("exception", err);
        }
        workflow.emit("updatetrainerslot");
      });
    });

    workflow.on("updatetrainerslot", function() {
      req.app.db.models.Trainerslot.findOneAndUpdate(
        { _id: workflow.session.slot },
        { trainer_status: "active" },
        function(err, tslot) {
          if (err) {
            return workflow.emit("exception", err);
          }
          workflow.emit("findUserpackage");
        }
      );
    });
    workflow.on("findUserpackage", function() {
      req.app.db.models.Userpackage.findOne(
        { _id: workflow.session.user_package },
        function(err, upack) {
          if (err) {
            return workflow.emit("exception", err);
          }
          if (!upack) {
            return workflow.emit("exception", "no user package found");
          }
          workflow.userpack = upack;
          return workflow.emit("updateUserPackage");
        }
      );
    });

    workflow.on("updateUserPackage", function() {
      workflow.userpack.update(
        workflow.userpack.status == "completed"
          ? {
              status: "active",
              session_left: workflow.userpack.session_left + 1
            }
          : { session_left: workflow.userpack.session_left + 1 },
        function(err, upack) {
          if (err) {
            return workflow.emit("exception", err);
          }
          workflow.emit("response");
        }
      );
    });

    workflow.emit("findsession");
  },

  upcomingsessions: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    req.app.db.models.Session.find(
      {
        account: req.account.id,
        workplace: req.body.workplaceid,
        timeslot: { $gt: req.body.stime },
        status: "upcoming"
      },
      "trainer_allotted workplace slot status created_at",
      function(err, sess) {
        if (err) {
          return workflow.emit("exception", err);
        }
        workflow.outcome.upcomingsessions = sess;
        return workflow.emit("response");
      }
    ).populate(
      "workplace trainer_allotted slot",
      "name phone date_time address"
    );
  },

  completedsessions: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    req.app.db.models.Session.find(
      {
        account: req.account.id,
        workplace: req.body.workplaceid,
        status: "completed"
      },
      function(err, sess) {
        if (err) {
          return workflow.emit("exception", err);
        }
        workflow.outcome.completedsession = sess;
        return workflow.emit("response");
      }
    );
  },

  fetchactivepackages: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    req.app.db.models.Userpackage.find(
      {
        account: req.account.id,
        status: "active",
        workplace: req.body.workplaceid
      },
      function(err, upack) {
        if (err) {
          return workflow.emit("exception", err);
        }
        if (!upack) {
          return workflow.emit("exception", "package not found");
        }
        workflow.outcome.userpacks = upack;
        return workflow.emit("response");
      }
    );
  },

  fetchinactivepackages: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    req.app.db.models.Userpackage.find(
      {
        account: req.account.id,
        status: "unpaid",
        workplace: req.body.workplaceid
      },
      function(err, upack) {
        if (err) {
          return workflow.emit("exception", err);
        }
        workflow.outcome.userpacks = upack;
        return workflow.emit("response");
      }
    );
  },

  // fetchfreeslots:function (req,res) {
  //     var workflow = req.app.utility.workflow(req, res);
  //     console.log(req.body.date+24)
  //     req.app.db.models.Trainerslot.aggregate([
  //       // First Stage
  //       {
  //         $match : {
  //             "date_time":{
  //                   "$gte": req.body.sdate
  //                 }
  //             // "trainer_status":"active",
  //             // "session_type":{$in:[req.body.sessiontype]}
  //           }
  //       },
  //       // Second Stage
  //       {
  //         $group : {
  //            _id:"$date_time",
  //            count: { $sum: 1 }
  //         }
  //       }
  //       // Third Stage

  //      ],function (err,tslots) {
  //        if (err){
  //          return workflow.emit('exception',err)
  //        }
  //        workflow.outcome.tslot = tslots
  //        workflow.emit('response')
  //      })
  //   },

  getAccountDetails: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var fieldsToSet = {
      name: req.account.name,
      phone: req.account.phone,
      email: req.account.email,
      referalcode: req.account.referal.referalid,
      referalamount: req.account.referal.referalamount
    };
    workflow.outcome.account = fieldsToSet;
    workflow.emit("response");
  },
  updateAccount: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var fieldsToSet = {
      name: req.body.name,
      email: req.body.email
    };
    req.account.update(fieldsToSet, function(err, acc) {
      if (err) {
        return workflow.emit("exception", err);
      }
      workflow.emit("response");
    });
  },

  getOtherAccountDetails: function(req, res, next) {
    var outcome = {};
    var query = req.query.accountid;
    var getAccountData = function(callback) {
      req.app.db.models.Account.findById(
        query,
        "d_p zip phone company name.first name.last name.full  "
      ).exec(function(err, account) {
        if (err) {
          return callback(err, null);
        }
        outcome.zip = account.zip;
        outcome.d_p = account.d_p;
        outcome.phone = account.phone;
        outcome.gender = account.gender;
        outcome.tag = account.tag;
        outcome.fullname = account.fullname;
        callback(null, "done");
      });
    };

    var asyncFinally = function(err, results) {
      if (err) {
        return next(err);
      }
      outcome.success = true;
      outcome.errfor = "";
      res.status(200).json(outcome);

      //res.render('account/settings/index', {
      //  data: {
      //    account: escape(JSON.stringify(outcome.account)),
      //    user: escape(JSON.stringify(outcome.user))
      //  },
      //  oauthMessage: oauthMessage,
      //  oauthTwitter: !!req.app.config.oauth.twitter.key,
      //  oauthTwitterActive: outcome.user.twitter ? !!outcome.user.twitter.id : false,
      //  oauthGitHub: !!req.app.config.oauth.github.key,
      //  oauthGitHubActive: outcome.user.github ? !!outcome.user.github.id : false,
      //  oauthFacebook: !!req.app.config.oauth.facebook.key,
      //  oauthFacebookActive: outcome.user.facebook ? !!outcome.user.facebook.id : false,
      //  oauthGoogle: !!req.app.config.oauth.google.key,
      //  oauthGoogleActive: outcome.user.google ? !!outcome.user.google.id : false,
      //  oauthTumblr: !!req.app.config.oauth.tumblr.key,
      //  oauthTumb6+lrActive: outcome.user.tumblr ? !!outcome.user.tumblr.id : false
      //});
    };

    require("async").parallel([getAccountData], asyncFinally);
  },

  gethomepage: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    fs.readFile(
      "/home/ravi/Social_2/homepage.json",
      // callback function that is called when reading file is done
      function(err, data) {
        // json data
        var jsonData = data;
        //console.log(data)

        // parse json
        var jsonParsed = JSON.parse(jsonData);

        // access elements
        //console.log(jsonParsed);
        //console.log(jsonParsed.persons[1].name + " is from " + jsonParsed.persons[0].city);
        //workflow.outcome.homepage = jsonParsed
        res.send(jsonParsed);
      }
    );
  },

  cancelorder: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on("findandupdateorder", function() {
      req.app.db.models.Order.findOneAndUpdate(
        { _id: req.body.orderid },
        { status: "Cancelled" },
        function(err, order) {
          if (err) {
            return workflow.emit("exception", err);
          }
          if (!order) {
            return workflow.emit("exception", "order not found");
          }
          workflow.emit("response");
        }
      );
    });

    workflow.emit("findandupdateorder");
  },

  userlocationrecord: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    console.log(req.body);
    workflow.on("createlocation", function() {
      var fieldsToSet = {
        accountid: req.account.id,

        addressline: req.body.address,

        pincode: req.body.pincode
      };
      req.app.db.models.Pastlocation.create(fieldsToSet, function(err, res) {
        if (err) {
          return workflow.emit("exception", err);
        }
        workflow.pastloc = res;
        workflow.emit("linkpastloctouser");
      });
    });

    workflow.on("linkpastloctouser", function() {
      req.account.update(
        { $push: { pastlocation: workflow.pastloc.id } },
        function(err, res) {
          if (err) {
            return workflow.emit("exception", err);
          }
          workflow.emit("response");
        }
      );
    });
    workflow.emit("createlocation");
  },

  referalsubmit: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on("checkuserrefstatus", function() {
      if (req.account.referal.referalused) {
        return workflow.emit("exception", "referal already used by user");
      }
      workflow.emit("findreferal");
    });
    workflow.on("findreferal", function() {
      req.app.db.models.Referal.findOne(
        { referalid: req.body.referalid },
        function(err, ref) {
          if (err) {
            return workflow.emit("exception", "Invalid Referal Code");
          }
          if (!ref) {
            return workflow.emit("exception", "Invalid Referal Code");
          }
          if (ref.referalid == req.account.referal.referalid) {
            return workflow.emit("exception", "Use a different Code");
          }
          ref.update(
            {
              $inc: {
                referalamount: Math.floor(Math.random() * (+35 - +30)) + +30
              }
            },
            function(err, res) {
              if (err) {
                return workflow.emit("exception", err);
              }
              workflow.emit("addvatluetouser");
            }
          );
        }
      );
    });
    workflow.on("addvatluetouser", function() {
      req.app.db.models.Referal.findOneAndUpdate(
        { referalid: req.account.referal.referalid },
        {
          $inc: {
            referalamount: Math.floor(Math.random() * (+55 - +50)) + +50
          },
          referalused: true
        },
        function(err, ref) {
          if (err) {
            return workflow.emit("exception", "there was some error");
          }
          workflow.emit("response");
        }
      );
    });

    workflow.emit("checkuserrefstatus");
  },

  getreferal: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.outcome.referalamount = req.account.referal.referalamount;
    workflow.outcome.referalid = req.account.referal.referalid;
    workflow.emit("response");
  },

  getpromotions: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.outcome.referalamount = req.account.referal.referalamount;
    workflow.emit("response");
  },

  createuseraddress: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on("validate", function() {
      console.log(req.body);
      if (!req.body.name) {
        workflow.outcome.errfor.name = "name";
      }
      if (!req.body.address) {
        workflow.outcome.errfor.address = "address required";
      }
      if (workflow.hasErrors()) {
        return workflow.emit("response");
      } else {
        workflow.emit("createaddressbook");
      }
    });

    workflow.on("createaddressbook", function() {
      var fieldsToSet = {
        name: req.body.name,

        address: req.body.address,

        landmark: req.body.landmark,

        pincode: req.body.pincode,

        area: req.body.area,

        city: req.body.city,

        state: req.body.state,

        mobile: req.body.mobile
      };
      req.app.db.models.AddressBook.create(fieldsToSet, function(
        err,
        addressbook
      ) {
        if (err) {
          return workflow.emit("exception", err);
        }
        workflow.addressbook = addressbook;
        workflow.emit("linktoacc");
      });
    });
    workflow.on("linktoacc", function() {
      req.account.update(
        { $push: { addressbook: workflow.addressbook.id } },
        function(err, acount) {
          if (err) {
            return workflow.emit("exception", err);
          }
          //workflow.addressbook = addressbook
          workflow.outcome.addressid = workflow.addressbook.id;
          //console.log('i did my job')
          //console.log(workflow.outcome)
          workflow.emit("response");
        }
      );
    });
    workflow.emit("validate");
  },

  getaddress: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    req.app.db.models.Account.populate(
      req.account,
      { path: "addressbook" },
      function(err, account) {
        if (err) {
          return workflow.emit("exception", err);
        }
        workflow.outcome.list = account.addressbook;
        workflow.emit("response");
      }
    );
  },

  getorders: function(req, res) {
    var workflow = req.app.utility.workflow(req, res);
    req.app.db.models.Account.populate(
      req.account,
      { path: "order", populate: { path: "cart deliveryaddress" } },
      function(err, account) {
        if (err) {
          return workflow.emit("exception", err);
        }
        workflow.outcome.list = account.order;
        workflow.emit("response");
      }
    );
  },

  update_account: function(req, res, next) {
    // ask for various conditions on fronthend which might be needned to ask at the backend
    var workflow = req.app.utility.workflow(req, res);

    workflow.on("patchAccount", function() {
      var fieldsToSet = {
        fullname: req.body.fullname || req.user.roles.account.fullname,
        company: req.body.company || req.user.roles.account.company,
        phone: req.body.phone || req.user.roles.account.phone,
        zip: req.body.zip || req.user.roles.account.zip,
        d_o_b: req.body.d_o_b || req.user.roles.account.d_o_b,
        gender: req.body.gender || req.user.roles.account.gender,
        search: [req.body.fullname || req.user.roles.account.fullname]
      };
      // var options = { select: 'name company phone zip' };  options is removed from the find update function
      req.app.db.models.Account.findByIdAndUpdate(
        req.user.roles.account.id,
        fieldsToSet,
        function(err, account) {
          if (err) {
            return workflow.emit("exception", err);
          }
          workflow.outcome.account = account; //ask what all is needed at the output
          return workflow.emit("response");
        }
      );
    });

    workflow.emit("patchAccount");
  },
  identity: function(req, res, next) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on("validate", function() {
      if (!req.body.username) {
        workflow.outcome.errfor.username = "required";
      } else if (!/^[a-zA-Z0-9\-\_]+$/.test(req.body.username)) {
        workflow.outcome.errfor.username =
          "only use letters, numbers, '-', '_'";
      }

      if (!req.body.email) {
        workflow.outcome.errfor.email = "required";
      } else if (
        !/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(
          req.body.email
        )
      ) {
        workflow.outcome.errfor.email = "invalid email format";
      }

      if (workflow.hasErrors()) {
        return workflow.emit("response");
      }

      workflow.emit("duplicateUsernameCheck");
    });

    workflow.on("duplicateUsernameCheck", function() {
      req.app.db.models.User.findOne(
        { username: req.body.username, _id: { $ne: req.user.id } },
        function(err, user) {
          if (err) {
            return workflow.emit("exception", err);
          }

          if (user) {
            workflow.outcome.errfor.username = "username already taken";
            return workflow.emit("response");
          }

          workflow.emit("duplicateEmailCheck");
        }
      );
    });

    workflow.on("duplicateEmailCheck", function() {
      req.app.db.models.User.findOne(
        { email: req.body.email.toLowerCase(), _id: { $ne: req.user.id } },
        function(err, user) {
          if (err) {
            return workflow.emit("exception", err);
          }

          if (user) {
            workflow.outcome.errfor.email = "email already taken";
            return workflow.emit("response");
          }

          workflow.emit("patchUser");
        }
      );
    });

    workflow.on("patchUser", function() {
      var fieldsToSet = {
        username: req.body.username,
        email: req.body.email.toLowerCase(),
        search: [req.body.username, req.body.email]
      };
      var options = {
        select: "username email twitter.id github.id facebook.id google.id"
      };

      req.app.db.models.User.findByIdAndUpdate(
        req.user.id,
        fieldsToSet,
        options,
        function(err, user) {
          if (err) {
            return workflow.emit("exception", err);
          }

          workflow.emit("patchAdmin", user);
        }
      );
    });

    workflow.on("patchAdmin", function(user) {
      if (user.roles.admin) {
        var fieldsToSet = {
          user: {
            id: req.user.id,
            name: user.username
          }
        };
        req.app.db.models.Admin.findByIdAndUpdate(
          user.roles.admin,
          fieldsToSet,
          function(err, admin) {
            if (err) {
              return workflow.emit("exception", err);
            }

            workflow.emit("patchAccount", user);
          }
        );
      } else {
        workflow.emit("patchAccount", user);
      }
    });

    workflow.on("patchAccount", function(user) {
      if (user.roles.account) {
        var fieldsToSet = {
          user: {
            id: req.user.id,
            name: user.username
          }
        };
        req.app.db.models.Account.findByIdAndUpdate(
          user.roles.account,
          fieldsToSet,
          function(err, account) {
            if (err) {
              return workflow.emit("exception", err);
            }

            workflow.emit("populateRoles", user);
          }
        );
      } else {
        workflow.emit("populateRoles", user);
      }
    });

    workflow.on("populateRoles", function(user) {
      user.populate("roles.admin roles.account", "name.full", function(
        err,
        populatedUser
      ) {
        if (err) {
          return workflow.emit("exception", err);
        }

        workflow.outcome.user = populatedUser;
        workflow.emit("response");
      });
    });

    workflow.emit("validate");
  },
  password: function(req, res, next) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on("validate", function() {
      if (!req.body.newPassword) {
        workflow.outcome.errfor.newPassword = "required";
      }

      if (!req.body.confirm) {
        workflow.outcome.errfor.confirm = "required";
      }

      if (req.body.newPassword !== req.body.confirm) {
        workflow.outcome.errors.push("Passwords do not match.");
      }

      if (workflow.hasErrors()) {
        return workflow.emit("response");
      }

      workflow.emit("patchUser");
    });

    workflow.on("patchUser", function() {
      req.app.db.models.User.encryptPassword(req.body.newPassword, function(
        err,
        hash
      ) {
        if (err) {
          return workflow.emit("exception", err);
        }

        var fieldsToSet = { password: hash };
        req.app.db.models.User.findByIdAndUpdate(
          req.user.id,
          fieldsToSet,
          function(err, user) {
            if (err) {
              return workflow.emit("exception", err);
            }

            user.populate("roles.admin roles.account", "name.full", function(
              err,
              user
            ) {
              if (err) {
                return workflow.emit("exception", err);
              }

              workflow.outcome.newPassword = "";
              workflow.outcome.confirm = "";
              workflow.emit("response");
            });
          }
        );
      });
    });

    workflow.emit("validate");
  },
  upsertVerification: function(req, res, next) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on("generateTokenOrSkip", function() {
      console.log("I came here 6");
      if (req.user.roles.account.isVerified === "yes") {
        workflow.outcome.errors.push("account already verified");
        return workflow.emit("response");
      }
      if (req.user.roles.account.verificationToken !== "") {
        //token generated already
        return workflow.emit("response");
      }
      console.log("I came here 4");
      workflow.emit("generateToken");
    });

    workflow.on("generateToken", function() {
      var crypto = require("crypto");
      crypto.randomBytes(21, function(err, buf) {
        if (err) {
          return next(err);
        }

        var token = buf.toString("hex");
        req.app.db.models.User.encryptPassword(token, function(err, hash) {
          if (err) {
            return next(err);
          }
          console.log("I came here 5");
          workflow.emit("patchAccount", token, hash);
        });
      });
    });

    workflow.on("patchAccount", function(token, hash) {
      var fieldsToSet = { verificationToken: hash };
      req.app.db.models.Account.findByIdAndUpdate(
        req.user.roles.account.id,
        fieldsToSet,
        function(err, account) {
          if (err) {
            return workflow.emit("exception", err);
          }

          sendVerificationEmail(req, res, {
            email: req.user.email,
            verificationToken: token,
            onSuccess: function() {
              return workflow.emit("response");
            },
            onError: function(err) {
              return next(err);
            }
          });
        }
      );
    });

    workflow.emit("generateTokenOrSkip");
  },
  resendVerification: function(req, res, next) {
    var workflow = req.app.utility.workflow(req, res);

    req.app.db.models.User.findOne({ username: req.query.username }, function(
      err,
      user
    ) {
      if (err) {
        return workflow.emit("exception", "user not found i think");
      }
      if (!user) {
        console.log("do i came here?");
        return workflow.emit("exception", "user not found");
      }

      workflow.user = user;
      if (workflow.user.roles.account.isVerified === "yes") {
        return workflow.emit("exception", "account already verified");
      } else {
        workflow.emit("validate");
      }
    }).populate("roles.account");

    workflow.on("validate", function() {
      console.log("im running 1");
      workflow.emit("generateToken");
    });

    workflow.on("generateToken", function() {
      console.log("im running 2");
      var crypto = require("crypto");
      crypto.randomBytes(21, function(err, buf) {
        if (err) {
          return next(err); // check this error statement
        }

        var token = buf.toString("hex");
        req.app.db.models.User.encryptPassword(token, function(err, hash) {
          if (err) {
            return next(err);
          }

          workflow.emit("patchAccount", token, hash);
        });
      });
    });

    workflow.on("patchAccount", function(token, hash) {
      console.log("im running 3");
      var fieldsToSet = { verificationToken: hash };
      req.app.db.models.Account.findByIdAndUpdate(
        workflow.user.roles.account.id,
        fieldsToSet,
        function(err, account) {
          if (err) {
            return workflow.emit("exception", err);
          }

          sendVerificationEmail(req, res, workflow.user.id, {
            email: workflow.user.username,
            verificationToken: token,
            onSuccess: function() {
              workflow.emit("response");
            },
            onError: function(err) {
              workflow.outcome.errfor.email = "Error Sending: " + err;
              workflow.emit("response");
            }
          });
        }
      );
    });
  },
  verify: function(req, res, next) {
    var outcome = {};
    var workflow = req.app.utility.workflow(req, res);
    req.app.db.models.User.findById(req.query.userID, function(err, user) {
      if (err) {
        return workflow.emit("exception", "user not found i think");
      }
      if (user) {
        workflow.user = user;
        req.app.db.models.User.validatePassword(
          req.query.token,
          workflow.user.roles.account.verificationToken,
          function(err, isValid) {
            if (!isValid) {
              /*outcome.errfor.exception = "invalid verification token";
                  outcome.success = false;*/

              return workflow.emit("exception", "invalid verification token");
            }
            var fieldsToSet = { isVerified: "yes", verificationToken: "" };
            req.app.db.models.Account.findByIdAndUpdate(
              workflow.user.roles.account._id,
              fieldsToSet,
              function(err, account) {
                if (err) {
                  return workflow.emit("exception", err);
                }
                outcome.success = true;
                outcome.user = {
                  id: workflow.user._id,
                  email: workflow.user.username,
                  isVerified: true
                };
                return res.status(200).json(outcome);
              }
            );
          }
        );
      } else {
        outcome.success = false;
        outcome.errfor.userID = "not found";
        return res.status(200).json(outcome);
      }
    }).populate("roles.account");
  }
};
module.exports = account;
