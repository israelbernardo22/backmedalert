
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// The SDK will automatically use the available service account in the Google Cloud environment
admin.initializeApp();
const db = admin.firestore();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- User Authentication ---

// Register a new user
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send({ message: 'Email and password are required' });
  }

  try {
    // Check if user already exists
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    if (!snapshot.empty) {
        return res.status(409).send({ message: 'User with this email already exists' });
    }

    // In a real app, you would hash and salt the password. Storing it in plaintext is insecure.
    const newUserRef = await usersRef.add({ email, password });
    
    // Create a corresponding family for the user
    // We use the user's ID as the family's ID for easy mapping
    const newFamilyRef = db.collection('families').doc(newUserRef.id);
    await newFamilyRef.set({ profiles: [] });

    console.log('User registered:', { id: newUserRef.id, email });
    res.status(201).send({ id: newUserRef.id, email });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).send({ message: 'Error registering user' });
  }
});

// Login a user
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
    if (!email || !password) {
    return res.status(400).send({ message: 'Email and password are required' });
  }

  try {
    const usersRef = db.collection('users');
    // This is insecure. Passwords should be hashed.
    const snapshot = await usersRef.where('email', '==', email).where('password', '==', password).limit(1).get();

    if (snapshot.empty) {
      return res.status(401).send({ message: 'Invalid credentials' });
    }

    const userDoc = snapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };
    
    console.log('User logged in:', {id: user.id, email: user.email});
    res.send({ id: user.id, email: user.email });

  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).send({ message: 'Error logging in user' });
  }
});

// --- Family and Profiles ---

// Get a user's family and profiles
app.get('/api/family/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const familyDoc = await db.collection('families').doc(userId).get();

    if (familyDoc.exists) {
      res.send({id: familyDoc.id, ...familyDoc.data()});
    } else {
      res.status(404).send({ message: 'Family not found' });
    }
  } catch (error) {
    console.error("Error getting family:", error);
    res.status(500).send({ message: 'Error getting family data' });
  }
});

// Add a profile to a family
app.post('/api/family/:userId/profiles', async (req, res) => {
  const { userId } = req.params;
  const { name, relation } = req.body;

  try {
    const familyRef = db.collection('families').doc(userId);
    const familyDoc = await familyRef.get();

    if (!familyDoc.exists) {
      return res.status(404).send({ message: 'Family not found' });
    }

    const newProfile = {
      id: Date.now().toString(), // Using timestamp as a simple unique ID
      name,
      relation,
    };

    // Atomically add a new profile to the "profiles" array field.
    await familyRef.update({
        profiles: admin.firestore.FieldValue.arrayUnion(newProfile)
    });
    
    console.log('Added profile to family:', newProfile);
    res.status(201).send(newProfile);
  } catch (error) {
    console.error("Error adding profile:", error);
    res.status(500).send({ message: 'Error adding profile' });
  }
});

// --- Medications ---
app.post('/api/medications', async (req, res) => {
    const medicationData = req.body;
    if (!medicationData || Object.keys(medicationData).length === 0) {
        return res.status(400).json({ message: 'Medication data cannot be empty' });
    }

    try {
        const newMedicationRef = await db.collection('medications').add(medicationData);
        const newMedication = { id: newMedicationRef.id, ...medicationData };

        console.log('Added medication:', newMedication);
        res.status(201).json(newMedication);
    } catch (error) {
        console.error("Error adding medication:", error);
        res.status(500).send({ message: 'Error adding medication' });
    }
});


app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
