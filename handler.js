const AWS = require('aws-sdk');
const { config } = require('./config');

const s3 = new AWS.S3();
const sns = new AWS.SNS();

module.exports.process = async (event) => {
  if (event.Records && event.Records[0] && event.Records[0].s3) {
    try {
      const bucket = event.Records[0].s3.bucket;
      const object = event.Records[0].s3.object;

      if (!bucket) {
        throw new Error('No bucket object was provided.');
      }
      if (!object) {
        throw new Error('No file object object was provided.');
      }

      const inboxBucket = event.Records[0].s3.bucket.name;
      const inboxKey = decodeURIComponent(
        event.Records[0].s3.object.key.replace(/\+/g, ' ')
      );

      console.info(`Fetching email at s3://${inboxBucket}/${inboxKey}`);

      const data = await s3
        .getObject({
          Bucket: inboxBucket,
          Key: inboxKey,
        })
        .promise();

      if (data) {
        console.info('parsing the message...');

        var fileContents = data.Body.toString();
        var json = JSON.parse(fileContents);

        if (json && json.id) {
          const { id, recieved, subject, from, to, html } = json;

          const fromAddress = from.value[0].address;
          const fromName = from.value[0].name;

          const toAddress = to.value[0].address;
          const toName = to.value[0].name;

          const message = {
            id,
            recieved,
            subject,
            from: {
              address: fromAddress,
              name: fromName,
            },
            to: {
              address: toAddress,
              name: toName,
            },
            html,
          };

          const result = await sns
            .publish({
              TopicArn: config.snsArn,
              Message: JSON.stringify(message),
            })
            .promise();

          if (result) {
            await s3
              .deleteObject({
                Bucket: inboxBucket,
                Key: inboxKey,
              })
              .promise();

            return {
              statusCode: 200,
              body: JSON.stringify({
                message: result,
                event,
              }),
            };
          } else {
            throw new Error('No result from dynamoDb');
          }
        } else {
          throw new Error('file did not contain expected data.');
        }
      } else {
        throw new Error('No data found.');
      }
    } catch (error) {
      console.error(error);
      throw new Error('Internal server error');
    }
  }

  throw new Error('Incorrect event params!');
};
