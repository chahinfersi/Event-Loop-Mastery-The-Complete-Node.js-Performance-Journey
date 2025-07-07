const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email'
    }
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'User must belong to a team']
  },
  role: {
    type: String,
    enum: ['member', 'admin'],
    default: 'member'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ team: 1 });

module.exports = mongoose.model('User', userSchema);