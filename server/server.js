const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Error:', err));

// ===================== Models =====================
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
});
const User = mongoose.model('User', UserSchema);

const ProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: String,
  company: String,
  website: String,
  location: String,
  skills: [String],
  bio: String,
  githubusername: String
});
const Profile = mongoose.model('Profile', ProfileSchema);

const PostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  name: String,
  likes: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }]
});
const Post = mongoose.model('Post', PostSchema);

// ===================== Middleware =====================
const auth = async (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// ===================== Routes =====================

// Register
app.post('/api/users/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ msg: 'User already exists' });
  const user = new User({ name, email, password });
  await user.save();
  res.json({ msg: 'User registered successfully' });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.password !== password)
    return res.status(400).json({ msg: 'Invalid credentials' });
  const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Get User
app.get('/api/auth', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

// Create/Update Profile
app.post('/api/profile', auth, async (req, res) => {
  const data = { ...req.body, skills: req.body.skills };
  let profile = await Profile.findOne({ user: req.user.id });
  if (profile) {
    profile = await Profile.findOneAndUpdate({ user: req.user.id }, { $set: data }, { new: true });
  } else {
    profile = new Profile({ ...data, user: req.user.id });
    await profile.save();
  }
  res.json(profile);
});

// Get Current User's Profile
app.get('/api/profile/me', auth, async (req, res) => {
  const profile = await Profile.findOne({ user: req.user.id });
  if (!profile) return res.status(400).json({ msg: 'No profile found' });
  res.json(profile);
});

// Create Post
app.post('/api/posts', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  const post = new Post({ user: user.id, text: req.body.text, name: user.name });
  await post.save();
  res.json(post);
});

// Get All Posts
app.get('/api/posts', auth, async (req, res) => {
  const posts = await Post.find().sort({ _id: -1 });
  res.json(posts);
});

// Delete Post
app.delete('/api/posts/:id', auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (post.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Unauthorized' });
  await post.remove();
  res.json({ msg: 'Post removed' });
});

// Like Post
app.put('/api/posts/like/:id', auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (post.likes.some(like => like.user.toString() === req.user.id))
    return res.status(400).json({ msg: 'Post already liked' });
  post.likes.unshift({ user: req.user.id });
  await post.save();
  res.json(post.likes);
});

// ===================== Start Server =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
