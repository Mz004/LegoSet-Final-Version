require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  userName: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  loginHistory: [{
    dateTime: { type: Date, default: Date.now },
    userAgent: String
  }]
});

let User;

module.exports.initialize = async () => {
  return new Promise(function (resolve, reject) {
    const db = mongoose.createConnection('mongodb+srv://manavzadafiya:XUusx1PUVPB0aLp1@cluster0.asqkidq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db.on('error', (err) => {
      reject(err);
    });
    db.once('open', () => {
      User = db.model("users", userSchema);
      resolve();
    });
  });
};

module.exports.registerUser = async (userData) => {
  try {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    userData.password = hashedPassword;
    const newUser = new User(userData);
    await newUser.save();
    return 'User registered successfully';
  } catch (err) {
    if (err.code === 11000) {  // Duplicate key error
      throw new Error('User with this username or email already exists');
    }
    throw new Error(`Error registering user: ${err.message}`);
  }
};

module.exports.checkUser = async (userData) => {
  try {
    const user = await User.findOne({ userName: userData.userName });
    if (!user) {
      throw new Error('User not found');
    }

    const passwordMatch = await bcrypt.compare(userData.password, user.password);
    if (!passwordMatch) {
      throw new Error('Incorrect password');
    }

    // Update login history
    user.loginHistory.push({
      dateTime: new Date(),
      userAgent: userData.userAgent
    });
    await user.save();

    return {
      userName: user.userName,
      email: user.email,
      loginHistory: user.loginHistory
    };
  } catch (err) {
    throw new Error(`Error checking user: ${err.message}`);
  }
};