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
          reject({ status: 'CAPTCHA_FAILED', statusCode: 500 });
        } else {
          var parsedBody = JSON.parse(body);
          if (parsedBody.success) {
            resolve();
          } else {
            console.log('CAPTCHA_INVALID', body);
            reject({ status: 'CAPTCHA_INVALID', statusCode: 400 });
          }
        }
      });
  });
}

exports.handler = function(event, context) {
  console.log('Incoming event: ', event);
  console.log('Incoming context: ', context);
  var body = JSON.parse(event.body);
  var jsonCorsResponseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

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
            context.succeed(
              { statusCode: 500
              , headers: jsonCorsResponseHeaders
              , body: JSON.stringify({ error: 'Internal Error: Mail could not be sent.' }),
              }
            );
        }
        else {
            console.log("===EMAIL SENT===");
            console.log(data);
            context.succeed(
              { statusCode: 201
              , headers: jsonCorsResponseHeaders
              , body: JSON.stringify({})
              }
            );
        }
      });
      console.log('EMAIL CODE END');
      console.log('EMAIL: ', email);
    })
    .catch(function(err) { 
      console.log('CAPTCHA ERROR', err);
      context.fail('Bad Request: ' + err.status)

      context.succeed({
        statusCode: err.statusCode || 500,
        headers: jsonCorsResponseHeaders,
        body: JSON.stringify(
          { error: 'Operation unsuccessful: ' + err.status
          , status: err.status
          }
        )
      });
      
    });

};