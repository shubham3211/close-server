var express = require("express");
var path = require("path");
var favicon = require("serve-favicon");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var config = require("./config");
var index = require("./routes/index");
var users = require("./routes/users");
var passport = require("passport");
var mongoose = require("mongoose");
var jwt = require("jsonwebtoken");
var session = require("express-session");
var cors = require("cors");
/*require('crashreporter').configure({
	outDir: 'crash', // default to cwd 
    exitOnCrash: [true|false], // if you want that crash reporter exit(1) for you, default to true, 
    mailEnabled: true,
    mailTransportName: 'SMTP',
    mailTransportConfig: {
        service: 'Gmail',
        auth: {
            user: config.smtp.credentials.user,
            pass: config.smtp.credentials.password
        }
    },
    mailSubject: 'advanced.js crashreporter test',
    mailFrom: 'crashreporter contact@troopin.in',
    mailTo: 'ravi@troopin.in'
});*/

//mongoose.connect('mongodb://localhost/test-social');

var app = express();
app.config = config;
app.db = mongoose.createConnection(config.mongodb.uri);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
//app.use(express.static('/home/ravi/buyo-admin/'));

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(cors());
app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

require("./models")(app, mongoose);
require("./routes")(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

//setup utilities
app.utility = {};
app.utility.sendmail = require("./util/sendmail");
app.utility.workflow = require("./util/workflow");

module.exports = app;
