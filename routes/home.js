const { Router } = require('express');
const Course = require('../models/products');
const router = Router();

router.get('/', async (req, res) => {
  try {
    const courses = await Course.find();
    // Предположим, что у вас есть объект user, который передается в шаблон
    const user = req.user; // Предположим, что информация о пользователе доступна в запросе

    // Определяем, является ли пользователь администратором
    const isAdmin = user && user.role === 'admin';

    res.render('index', {
      title: 'главная страница',
      isHome: true,
      courses,
      user, // Передаем информацию о пользователе в шаблон
      isAdmin // Передаем информацию о статусе администратора
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
