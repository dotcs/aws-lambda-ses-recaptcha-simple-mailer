const aws = require('aws-sdk');
const request = require('request');

const {
  SES_ACCESS_KEY_ID,
  SES_SECRET_ACCESSKEY,
  SES_REGION,
  SENDER_MAIL,
  RECEIVER_MAIL,
  RECEIVER_MAIL_BCC
} = process.env;
let {
  CAPTCHA_PRIVATE_KEY,
} = process.env;

const sesConfig = {
  accessKeyId: SES_ACCESS_KEY_ID,
  secretAccesskey: SES_SECRET_ACCESSKEY,
  region: SES_REGION
};

// Configure SES environment
const ses = new aws.SES(sesConfig);

// Endpoints
const CAPTCHA_VERIFICATION_ENDPOINT = 'https://www.google.com/recaptcha/api/siteverify';

// NOTE:
// Error handling is done as described here: http://stackoverflow.com/a/31371862/434227

function verifyCaptcha(token, ip) {
  const data = 
    { response: token
    , secret: CAPTCHA_PRIVATE_KEY
    , remoteip: ip
    };
  return new Promise((resolve, reject) => {
    request.post({ url: CAPTCHA_VERIFICATION_ENDPOINT, form: data}, 
      function(err, httpResponse, body){
        if (err) {
          console.log('CAPTCHA_FAILED', err);
          reject({ status: 'CAPTCHA_FAILED', statusCode: 500 });
        } else {
          const parsedBody = JSON.parse(body);
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
  const body = JSON.parse(event.body);
  const jsonCorsResponseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  verifyCaptcha(body['g-recaptcha-response'], context.sourceIp)
    .then(() => {
      const eParams = 
        { Destination: { ToAddresses: RECEIVER_MAIL.split(','), BccAddresses: RECEIVER_MAIL_BCC.split(',') }
        , Message: 
          { Body: { Text: { Data: body.message } }
          , Subject: { Data: body.subject }
          }
        , Source: SENDER_MAIL
        };

      console.log('===SENDING EMAIL===');
      const email = ses.sendEmail(eParams, (err, data) => {
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
    .catch((err) => { 
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