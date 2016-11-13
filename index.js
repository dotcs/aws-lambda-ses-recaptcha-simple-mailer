var aws = require('aws-sdk');
var request = require('request');
var envPath = process.env.NODE_ENV === 'test' ? './env.test' : './env';
var env = require(envPath);

// Configure SES environment
var ses = new aws.SES(env.SES);

// Endpoints
var CAPTCHA_VERIFICATION_ENDPOINT = 'https://www.google.com/recaptcha/api/siteverify';

// NOTE:
// Error handling is done as described here: http://stackoverflow.com/a/31371862/434227

function verifyCaptcha(token, ip) {
  var data = 
    { response: token
    , secret: env.CAPTCHA_PRIVATE_KEY
    , remoteip: ip
    };
  return new Promise(function(resolve, reject) {
    request.post({ url: CAPTCHA_VERIFICATION_ENDPOINT, form: data}, 
      function(err, httpResponse, body){
        if (err) {
          console.log('CAPTCHA_FAILED', err);
          reject({ status: 'CAPTCHA_FAILED' });
        } else {
          var parsedBody = JSON.parse(body);
          if (parsedBody.success) {
            resolve();
          } else {
            console.log('CAPTCHA_INVALID', body);
            reject({ status: 'CAPTCHA_INVALID' });
          }
        }
      });
  });
}

exports.handler = function(event, context) {
  console.log('Incoming event: ', event);
  console.log('Incoming context: ', context);
  var body = JSON.parse(event.body);

  verifyCaptcha(body['g-recaptcha-response'], context.sourceIp)
    .then(function() {
      var eParams = 
        { Destination: { ToAddresses: [env.RECEIVER_MAIL] }
        , Message: 
          { Body: { Text: { Data: body.message } }
          , Subject: { Data: body.subject }
          }
        , Source: env.SENDER_MAIL
        };

      console.log('===SENDING EMAIL===');
      var email = ses.sendEmail(eParams, function(err, data){
        if(err) {
            console.log('===EMAIL NOT SENT===');
            console.log(err);
            context.fail('Internal Error: Mail could not be sent.');
        }
        else {
            console.log("===EMAIL SENT===");
            console.log(data);
                context.succeed({
                "statusCode": 201,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": "{}"
            });
        }
      });
      console.log('EMAIL CODE END');
      console.log('EMAIL: ', email);
    })
    .catch(function(err) { 
      console.log('CAPTCHA ERROR', err);
      context.fail('Bad Request: ' + err.status)
    });

};