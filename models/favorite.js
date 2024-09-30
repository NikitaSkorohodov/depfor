const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
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
  ]
});

favoriteSchema.statics.fetchByUser = async function(userId) {
  return this.findOne({ user: userId });
};

favoriteSchema.statics.add = async function(userId, course) {
  let favorite = await this.findOne({ user: userId });
  if (!favorite) {
    favorite = new this({ user: userId });
  }
  favorite.courses.push(course);
  await favorite.save();
  return favorite;
};

favoriteSchema.statics.remove = async function(userId, courseId) {
  let favorite = await this.findOne({ user: userId });
  if (!favorite) {
    throw new Error("Favorites not found");
  }
  const index = favorite.courses.findIndex(course => course._id.toString() === courseId);
  if (index === -1) {
    throw new Error("Course not found in favorites");
  }
  favorite.courses.splice(index, 1);
  await favorite.save();
  return favorite;
};

const Favorite = mongoose.model('Favorite', favoriteSchema);

module.exports = Favorite;
