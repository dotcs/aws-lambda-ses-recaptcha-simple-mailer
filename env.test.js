var env = require('./env');

module.exports = Object.assign({}, env, {
  // Private key for testing purposes.
  // See: https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha-v2-what-should-i-do
  CAPTCHA_PRIVATE_KEY: '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe',
});