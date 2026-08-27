// To send a client-safe error response (full error is always logged server-side)
const sendError = (res, status, message, err) => {
  if (err) console.error(err);
  const body = { message };
  if (err && process.env.NODE_ENV !== 'production') body.error = err.message;
  res.status(status).json(body);
};

module.exports = sendError;
