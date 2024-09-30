// middlewares/authMiddleware.js

module.exports = function(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/auth/login'); // Перенаправление на страницу входа, если пользователь не авторизован
  };
  