const messages = require('./messages');

const getMessage = (key, lang = 'en', params = []) => {
  const msg = messages[key]?.[lang] || messages[key]?.en || 'Message not found';
  return params.reduce((acc, val) => acc.replace('%s', val), msg);
};

module.exports = getMessage;
