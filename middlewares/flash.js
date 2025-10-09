
module.exports = function flash() {
  return (req, res, next) => {
    req.flash = (type, message) => {
      if (!req.session.flash) req.session.flash = {};
      if (!Array.isArray(req.session.flash[type])) req.session.flash[type] = [];
      req.session.flash[type].push(message);
    };
    res.locals.flash = () => {
      const messages = req.session.flash || {};
      req.session.flash = {};
      return messages;
    };
    next();
  };
};