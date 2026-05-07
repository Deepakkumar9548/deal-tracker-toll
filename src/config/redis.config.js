const { redisUrl } = require("./env.config");

module.exports = {
  connection: {
    url: redisUrl,
  },
};
