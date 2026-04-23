module.exports = (req, res, next) => {
  const queryLang = req.query.lang;
  const headerLang = (req.headers['accept-language'] || '').split(',')[0];
  const userLang = req.user?.language;
  const supported = ['en', 'ar'];

  const chosen = queryLang || userLang || headerLang || 'en';
  req.lang = supported.includes(chosen) ? chosen : 'en';
  next();
};
