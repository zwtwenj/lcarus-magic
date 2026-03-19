require('dotenv').config();

module.exports = {
  port: process.env.PORT || 9400,
  jwtSecret: process.env.JWT_SECRET || 'default-dev-secret',
  nodeEnv: process.env.NODE_ENV || 'development',
};
