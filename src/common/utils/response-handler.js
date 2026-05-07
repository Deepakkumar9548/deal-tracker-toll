const success = (res, data, statusCode = 200) => res.status(statusCode).json(data);

const failure = (res, message, statusCode = 500, details = undefined) =>
  res.status(statusCode).json({ error: message, details });

module.exports = { success, failure };
