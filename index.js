require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());

// Authorization middleware
const authorizeUser = (req, res, next) => {
  const token = req.query.Authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).send('<h1 align="center"> Login to Continue </h1>');
  }

  try {
    // Verify and decode the token
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY, { algorithms: ['HS256'] });

    req.user = decodedToken;
    next(); // Proceed to the next middleware
  } catch (error) {
    return res.status(401).json({ message: 'Invalid authorization token' });
  }
};


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/login.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/login.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/register.html'));
});

app.get('/js/login.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/js/login.js'))
});

app.get('/css/login.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/login.css'))
});

app.get('/css/index.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/index.css'))
});

app.get('/css/admin.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/admin.css'))
});

app.get('/assets/eth5.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/assets/eth5.jpg'))
});

app.get('/js/app.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/js/app.js'))
});

app.get('/admin.html', authorizeUser, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/admin.html'));
});

app.get('/index.html', authorizeUser, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/index.html'));
});

app.get('/dist/login.bundle.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/dist/login.bundle.js'));
});

app.get('/dist/app.bundle.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/dist/app.bundle.js'));
});

app.get('/dist/register.bundle.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/dist/register.bundle.js'));
});

// Verify page (public, no auth required)
app.get('/verify.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/verify.html'));
});

app.get('/css/verify.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/verify.css'));
});

app.get('/dist/verify.bundle.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/dist/verify.bundle.js'));
});

// Audit page (public, no auth required)
app.get('/audit.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/audit.html'));
});

app.get('/dist/audit.bundle.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/dist/audit.bundle.js'));
});

// Serve static assets
app.use('/js', express.static(path.join(__dirname, 'src/js')));
app.use('/css', express.static(path.join(__dirname, 'src/css')));
app.use('/dist', express.static(path.join(__dirname, 'src/dist')));
app.use('/assets', express.static(path.join(__dirname, 'src/assets')));

// Voter Notification Endpoint
app.post('/admin/notify-voters', (req, res) => {
    console.log("Triggering voter notifications...");
    // In a real app, this would iterate through a database of voter emails
    // and send messages via an SMTP service or Twilio SendGrid.
    // For this demo, we simulate success.
    
    setTimeout(() => {
        res.json({ 
            success: true, 
            message: "Success! Notification emails have been queued for all approved voters." 
        });
    }, 1500);
});

// Serve the favicon.ico file
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/favicon.ico'));
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
