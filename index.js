
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001; // Use PORT from environment variable if available

app.use(cors());
app.use(express.json());

// This will be our in-memory data store
const users = [];
const families = [];

// --- User Authentication ---

// Register a new user
app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send({ message: 'Email and password are required' });
  }

  // Check if user already exists
  if (users.find(u => u.email === email)) {
      return res.status(409).send({ message: 'User with this email already exists' });
  }

  // In a real app, you would hash and salt the password
  const newUser = { id: Date.now().toString(), email, password };
  users.push(newUser);
  
  // Create a corresponding family for the user
  const newFamily = { id: newUser.id, profiles: [] };
  families.push(newFamily);

  console.log('User registered:', newUser);
  res.status(201).send({ id: newUser.id, email: newUser.email });
});

// Login a user
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    console.log('User logged in:', user);
    res.send({ id: user.id, email: user.email });
  } else {
    res.status(401).send({ message: 'Invalid credentials' });
  }
});

// --- Family and Profiles ---

// Get a user's family and profiles
app.get('/api/family/:userId', (req, res) => {
  const { userId } = req.params;
  const family = families.find(f => f.id === userId);

  if (family) {
    res.send(family);
  } else {
    res.status(404).send({ message: 'Family not found' });
  }
});

// Add a profile to a family
app.post('/api/family/:userId/profiles', (req, res) => {
  const { userId } = req.params;
  const { name, relation } = req.body;

  const family = families.find(f => f.id === userId);
  if (!family) {
    return res.status(404).send({ message: 'Family not found' });
  }

  const newProfile = {
    id: Date.now().toString(),
    name,
    relation,
  };

  family.profiles.push(newProfile);
  console.log('Added profile to family:', newProfile);
  res.status(201).send(newProfile);
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
