# aws-lambda-ses-recaptcha-simple-mailer

Provides a simple mail backend via AWS Lambda that uses AWS SES for sending mails and is secured via reCAPTCHA v2.

## Installation

To get the script running you have to provide a proper environment first. To do so copy `env.template.js` to `env.js` 
and set your SES variables, your ReCaptcha private key as well as both, sender and receiver mails.

Then install all necessary dependencies via `npm install`.

## Usage

With your `env.js` in place run `npm run build` in order to create a zip file in the `build` directory. 
This file contains both, the script and its environment as well as all necessary modules from the `node_modules` folder.

This script has been designed to work behind a AWS Gateway's POST method. It requires the client to send three properties 
via POST method, with a properly set header `Content-Type: 'application/json'`:

```
{
  "subject": string,
  "message": string,
  "g-recaptcha-response": string
}
```

`subject` and `message` are both free form texts, that are used for the mail subject and its message body. 
`g-recaptcha-response` must provide the token provided by reCAPTCHA for the request.

The script will then test the token against reCAPTCHA's backend by performing an HTTP request. 
If everything worked out the response will have status code 201 with an empty response body.

In case of an error it will give one of the following responses:

| Response status  | Description  | Respnose HTTP status code  |
|---|---|---|
| CAPTCHA_INVALID  | Given captcha code was invalid  | 400   |
| CAPTCHA_FAILED  | Problem when quering the reCAPTCHA API | 500  |
| OTHER | Problem when querying AWS SES | 500  |


## Tests

While this repo does not provide a full test suite, you can test the [reCAPTCHA v2 implementation by using their test keys](https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha-v2-what-should-i-do).

## Contribution

Feel free to contribute to this repository, but always make sure to exclude your `env.js` file as all private keys are 
stored in this file.