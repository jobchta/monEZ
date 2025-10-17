exports.handler = async function(event, context) {
  // Parse the incoming GitHub webhook payload
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid payload" };
  }

  // Log it to Netlify for testing
  console.log('Webhook received: ', payload);

  // Always return OK
  return { statusCode: 200, body: "Webhook received" };
};
