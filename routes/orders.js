const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Card = require('../models/card'); // Предполагается, что у вас есть модель корзины
const Course = require('../models/products');
const User = require('../models/user'); // Предполагается, что у вас есть модель пользователя

// POST /order/checkout - оформление заказа с выбором точки доставки
router.post('/checkout', async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).send('Неавторизованный пользователь');
    }

    const userId = req.user._id;
    const deliveryPoint = req.body.deliveryPoint; // Получаем выбранную точку доставки из тела запроса

    if (!deliveryPoint) {
      return res.status(400).send('Пожалуйста, выберите точку доставки');
    }

    const card = await Card.fetchByUser(userId);
    if (!card || card.courses.length === 0) {
      return res.status(400).send('В корзине нет курсов');
    }

    // Проверка наличия всех курсов
    const validCourses = await Promise.all(card.courses.map(async (course) => {
      const foundCourse = await Course.findById(course._id);
      if (!foundCourse) {
        console.error('Course not found for ID:', course._id);
        return null; // Убираем курс, если он не найден
      }
      return foundCourse;
    }));

    const filteredCourses = validCourses.filter(course => course !== null);

    const totalPrice = filteredCourses.reduce((acc, course) => acc + course.price, 0);

    const newOrder = new Order({
      user: userId,
      courses: filteredCourses.map(course => ({
        _id: course._id,
        title: course.title,
        price: course.price
      })),
      totalPrice: totalPrice,
      deliveryPoint: deliveryPoint
    });

    await newOrder.save();

    // Очищаем корзину пользователя после оформления заказа
    await Card.findOneAndDelete({ user: userId });

    res.redirect('/orders'); // Перенаправляем на страницу заказов или другую желаемую страницу
  } catch (error) {
    console.error('Ошибка при создании заказа:', error);
    res.status(500).send('Внутренняя ошибка сервера');
  }
});

// GET /orders - отображение списка заказов пользователя
router.get('/', async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).send('Unauthorized');
    }

    const orders = await Order.find({ user: req.user._id }).populate('user');

    // Проверка, если заказы отсутствуют, отправляем пустой массив в шаблон
    if (!orders || orders.length === 0) {
      return res.render('orders', {
        title: 'Ваши заказы',
        orders: []  // Отправляем пустой массив заказов
      });
    }

    // Преобразуем каждый заказ, чтобы заменить идентификаторы курсов на их названия
    const formattedOrders = await Promise.all(orders.map(async (order) => {
      if (!order) {
        throw new Error('Order is null or undefined');
      }

      const courses = await Promise.all(order.courses.map(async (courseId) => {
        
        try {
          const course = await Course.findById(courseId);
          if (!course) {
           
            return null; // Возвращаем null, если курс не найден
          }
          return { _id: course._id, title: course.title, price: course.price };
        } catch (error) {
          console.error('Error fetching course:', error);
          return null;
        }
      }));

      // Фильтрация несуществующих курсов
      const validCourses = courses.filter(course => course !== null);

      const formattedDate = order.date ? order.date.toDateString() : 'Unknown date';

      return {
        _id: order._id,
        user: order.user,
        courses: validCourses, // Используем только существующие курсы
        totalPrice: order.totalPrice,
        date: formattedDate,
        deliveryPoint: order.deliveryPoint,
        __v: order.__v
      };
    }));

    res.render('orders', {
      title: 'Ваши заказы',
      orders: formattedOrders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Internal Server Error');
  }
});


// GET /all-orders - отображение списка всех заказов для всех пользователей
router.get('/all-orders', async (req, res) => {
  try {
    const orders = await Order.find().populate('user');

    // Проверка, что заказы найдены
    if (!orders || orders.length === 0) {
      return res.status(404).send('No orders found');
    }

    // Преобразуем каждый заказ, чтобы заменить идентификаторы курсов на их названия
    const formattedOrders = await Promise.all(orders.map(async (order) => {
      if (!order) {
        throw new Error('Order is null or undefined');
      }

      const courses = await Promise.all(order.courses.map(async (courseId) => {
       
        try {
          const course = await Course.findById(courseId);
          if (!course) {
            console.error('Course not found for ID:', courseId); // Логирование ошибки
            return null; // Возвращаем null, если курс не найден
          }
          return { _id: course._id, title: course.title, price: course.price };
        } catch (error) {
          console.error('Error fetching course:', error);
          return null;
        }
      }));

      // Фильтрация несуществующих курсов
      const validCourses = courses.filter(course => course !== null);

      const formattedDate = order.date ? order.date.toDateString() : 'Unknown date';

      return {
        _id: order._id,
        user: order.user,
        courses: validCourses, // Используем только существующие курсы
        totalPrice: order.totalPrice,
        date: formattedDate,
        deliveryPoint: order.deliveryPoint,
        __v: order.__v
      };
    }));

    res.render('all-orders', {
      title: 'Все заказы',
      orders: formattedOrders
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).send('Internal Server Error');
  }
});

// DELETE /orders/delete/:id - удаление заказа
router.post('/delete/:id', async (req, res) => {
  try {
    const result = await Order.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).send('Order not found');
    }
    res.redirect('/orders');
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
