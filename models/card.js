const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courses: [
    {
      title: String,
      price: Number,
      img: String
    }
  ],
  totalPrice: {
    type: Number,
    default: 0
  }
});

cardSchema.statics.fetchByUser = async function(userId) {
  return this.findOne({ user: userId });
};

cardSchema.statics.add = async function(userId, course) {
  let card = await this.findOne({ user: userId });
  if (!card) {
    card = new this({ user: userId });
  }
  card.courses.push(course);
  card.totalPrice += course.price;
  await card.save();
  return card;
};

cardSchema.statics.remove = async function(userId, courseId) {
  let card = await this.findOne({ user: userId });
  if (!card) {
    throw new Error("Card not found");
  }
  const index = card.courses.findIndex(course => course._id.toString() === courseId);
  if (index === -1) {
    throw new Error("Course not found in card");
  }
  const removedCourse = card.courses.splice(index, 1)[0];
  card.totalPrice -= removedCourse.price;
  await card.save();
  return card;
};

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;
