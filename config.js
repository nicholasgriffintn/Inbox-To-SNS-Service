exports.config = {
  email: 'inbox@nicholasgriffin.dev',
  category: 'inbox',
  bucket: 'email.nicholasgriffin.dev',
  keyPrefix: 'processed/inbox',
  snsArn: 'arn:aws:sns:eu-west-1:175054299308:inbox-sns-receive',
  region: 'eu-west-1',
};
