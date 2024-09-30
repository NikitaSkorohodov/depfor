const express = require('express');
const router = express.Router();
const Card = require('../models/card');
const Course = require('../models/products');
const Order = require('../models/order');

// Middleware to set user status in response locals
router.use((req, res, next) => {
  res.locals.user = req.user; // Assuming `req.user` is populated if user is logged in
  next();
});
// Middleware для проверки аутентификации
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth/login');
}

// Применение middleware ко всем маршрутам в этом роутере
router.use(isAuthenticated);

// Add course to cart
router.post('/add', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }
    const userId = req.user._id;
    const course = await Course.findById(req.body.id);
    if (!course) {
      return res.status(404).send('Course not found');
    }
    await Card.add(userId, course);
    res.redirect('/card');
  } catch (error) {
    console.error('Error adding course to cart:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Remove course from cart
router.delete('/remove/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }
    const userId = req.user._id;
    const card = await Card.remove(userId, req.params.id);
    res.status(200).json(card);
  } catch (error) {
    console.error('Error removing course from cart:', error);
    res.status(500).json({ error: 'Failed to remove course from cart' });
  }
});

router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/auth/login'); // Redirect to login if not authenticated
    }
    const userId = req.user._id;
    const card = await Card.fetchByUser(userId);
    let totalPrice = 0;

    if (card && card.courses.length > 0) {
      totalPrice = card.courses.reduce((acc, course) => acc + course.price, 0);
    }

    // Define static delivery points
    const deliveryPoints = [
      { _id: 'Narva soldina 20 omniva pacautomat', name: 'Narva soldina 20 omniva pacautomat' },
      { _id: 'Narva magamarket omniva pacautomat', name: 'Narva magamarket omniva pacautomat' },
      { _id: 'Narva fama omniva pacautomat', name: 'Narva fama omniva pacautomat' }
    ];

    res.render('card', {
      title: 'Корзина',
      isCard: true,
      courses: card ? card.courses : [],
      totalPrice: totalPrice,
      deliveryPoints: deliveryPoints
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/checkout', async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).send('Unauthorized');
    }

    const userId = req.user._id;
    const deliveryPoint = req.body.deliveryPoint; // Get the selected delivery point from the request body

    if (!deliveryPoint) {
      return res.status(400).send('Please select a delivery point');
    }

    const card = await Card.fetchByUser(userId);
    if (!card || card.courses.length === 0) {
      return res.status(400).send('No courses in cart');
    }

    const totalPrice = card.courses.reduce((acc, course) => acc + course.price, 0);

    // Ensure deliveryPoint is a string and not empty
    if (typeof deliveryPoint !== 'string' || !deliveryPoint.trim()) {
      return res.status(400).send('Invalid delivery point');
    }

    const newOrder = new Order({
      user: userId,
      courses: card.courses,
      totalPrice: totalPrice,
      deliveryPoint: deliveryPoint
    });

    await newOrder.save();

    // Clear the user's cart after placing the order
    await Card.findOneAndDelete({ user: userId });

    res.redirect('/orders'); // Redirect to orders page or other desired location
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).send('Internal Server Error');
  }
});


module.exports = router;
