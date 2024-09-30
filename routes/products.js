const { Router } = require('express');
const Order = require('../models/order'); // Подключаем модель заказа

const Course = require('../models/products'); // Убедитесь, что модель импортирована правильно
const router = Router();

// GET /courses - отображение списка курсов
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find();
    res.render('products', {
      title: 'products',
      isCourses: true,
      courses
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/ed', async (req, res) => {
  try {
    const courses = await Course.find();
    res.render('edit', {
      title: 'products',
      isCourses: true,
      courses
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).send('Internal Server Error');
  }
});

// GET /courses/search - поиск курсов
router.get('/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const category = req.query.category;
    if (!searchTerm || typeof searchTerm !== 'string') {
      throw new Error('Invalid search term');
    }
    let query = {
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ]
    };
    if (category) {
      query.category = category;
    }
    const courses = await Course.find(query);
    res.render('search', {
      title: 'search',
      isCourses: true,
      courses
    });
  } catch (error) {
    console.error('Error searching courses:', error);
    res.status(500).send('Internal Server Error');
  }
});

// GET /courses/:id/edit - страница редактирования курса
router.get('/:id/edit', async (req, res) => {
  try {
    if (!req.query.allow) {
      return res.redirect('/');
    }
    const course = await Course.findById(req.params.id);
    res.render('course-edit', {
      title: `Редактировать ${course.title}`,
      course
    });
  } catch (error) {
    console.error('Error fetching course for edit:', error);
    res.status(500).send('Internal Server Error');
  }
});

// POST /courses/edit - обновление курса
router.post('/edit', async (req, res) => {
  try {
    const { id } = req.body;
    delete req.body.id;
    await Course.findByIdAndUpdate(id, req.body);
    res.redirect('/products/ed');
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).send('Internal Server Error');
  }
});

// GET /courses/:id - отображение информации о курсе
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).send('Course not found');
    }
    res.render('product', {
      layout: 'empty',
      title: `product ${course.title}`,
      course,
      user: req.user 
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).send('Internal Server Error');
  }
});

// POST /courses/:id/comments - добавление комментария к курсу
router.post('/:id/comments', async (req, res) => {
  try {
    const { user, text } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).send('Course not found');
    }

    const newComment = { user, text, date: new Date() };
    course.comments.push(newComment);
    await course.save();

    res.json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).send('Internal Server Error');
  }
});

// POST /courses/:id/delete - удаление курса
router.post('/:id/delete', async (req, res) => {
  const courseId = req.params.id;

  try {
    // Удаляем курс
    const deletedCourse = await Course.findByIdAndRemove(courseId);
    if (!deletedCourse) {
      return res.status(404).send('Course not found');
    }

    // Удаляем ссылки на этот курс из всех заказов
    const orders = await Order.find({ courses: courseId });
    await Promise.all(orders.map(async (order) => {
      // Убираем курс из списка курсов заказа
      order.courses = order.courses.filter(course => course.toString() !== courseId);

      // Если в заказе не осталось курсов, удаляем заказ
      if (order.courses.length === 0) {
        await Order.findByIdAndDelete(order._id);
      } else {
        // Пересчитываем общую цену заказа
        const updatedTotalPrice = await calculateOrderTotalPrice(order.courses);
        order.totalPrice = updatedTotalPrice;

        // Сохраняем обновленный заказ
        await order.save();
      }
    }));

    res.redirect('/products');
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Вспомогательная функция для пересчета общей суммы заказа
async function calculateOrderTotalPrice(courseIds) {
  const courses = await Course.find({ _id: { $in: courseIds } });
  return courses.reduce((total, course) => total + course.price, 0);
}



module.exports = router;