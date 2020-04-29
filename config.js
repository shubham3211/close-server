exports.hostname = process.env.hostname || 'localhost';
exports.port = process.env.PORT || 3000;
exports.secret = 'abf7bb59e15a080165ef62d6cded970f' ;
exports.companyName = 'Troopin';
exports.projectName = 'Troopin';
exports.s3accessId = 'AKIAIO2LMCOHXKVVCMDA';
exports.s3secretId = 'l3T4n4zbs4+WiYub80QkujfsXrD+0uRA+gfx2+uo';
exports.deliverycost = 0;
exports.mongodb = {
  uri: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/dooit'
};
exports.requireAccountVerification = true;
exports.requireJWTToken = true;
exports.smtp = {
  from: {
    name: process.env.SMTP_FROM_NAME || exports.projectName +' Website',
    address: process.env.SMTP_FROM_ADDRESS || 'contact@troopin.in'
  },
  credentials: {
    user: process.env.SMTP_USERNAME || 'contact@troopin.in',
    password: process.env.SMTP_PASSWORD || 'tagtag123',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    ssl: true
  }
};