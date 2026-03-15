require('dotenv').config({ path: '../.env' }); // Load root .env
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { verifyToken } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Public Route
app.get('/api/public', (req, res) => {
  res.json({ message: 'This is a public endpoint. Anyone can see this.' });
});

// Protected Route (Requires Firebase Authentication)
app.get('/api/protected', verifyToken, (req, res) => {
  // Access the verified user information from req.user
  res.json({ 
    message: 'This is a protected endpoint.', 
    user: {
      uid: req.user.uid,
      email: req.user.email,
      name: req.user.name || 'No name provided'
    } 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
