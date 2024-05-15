/********************************************************************************
* WEB322 – Assignment 06
*
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
*
* https://www.senecacollege.ca/about/policies/academic-integrity-policy.html
*
* Name: Manav Alpeshbhai Zadafiya     Student ID: 144095221     Date: 2024-04-21
*
* Published Website: https://worrisome-bat-long-johns.cyclic.app/
*
********************************************************************************/
const legoData = require('./modules/legoSets');
const authData = require('./modules/auth-service');
const clientSessions = require('client-sessions');
const path = require('path');
const express = require('express');
const app = express();

const HTTP_PORT = process.env.PORT || 8080;

// Middleware for serving static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Session management
app.use(
  clientSessions({
    cookieName: "session",
    secret: process.env.SESSION_SECRET || "default_secret",
    duration: 24 * 60 * 60 * 1000,
    activeDuration: 1000 * 60 * 5,
  })
);

// Attach session data to response locals
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Middleware to ensure the user is logged in
function ensureLogin(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Routes
app.get("/", (req, res) => res.render('home'));

app.get("/register", (req, res) => {
  res.render("register", {
    errorMessage: "",
    successMessage: "",
    userName: "",
  });
});

app.post('/register', async (req, res) => {
  try {
    const userData = req.body;
    await authData.registerUser(userData);
    res.render('register', {
      successMessage: "User created successfully",
      errorMessage: "",
      userName: ""
    });
  } catch (error) {
    res.render('register', {
      errorMessage: error.message || "Error during registration",
      successMessage: "",
      userName: req.body.userName
    });
  }
});

app.get("/login", (req, res) => {
  res.render("login", { errorMessage: "", userName: "" });
});

app.post('/login', async (req, res) => {
  try {
    req.body.userAgent = req.get('User-Agent');
    const user = await authData.checkUser(req.body);
    req.session.user = {
      userName: user.userName,
      email: user.email,
      loginHistory: user.loginHistory
    };
    res.redirect('/lego/sets');
  } catch (error) {
    res.render('login', {
      errorMessage: error.message || "Login failed",
      userName: req.body.userName
    });
  }
});

app.get("/about", (req, res) => res.render('about'));

app.get("/lego/sets/", async (req, res) => {
  const theme = req.query.theme;
  try {
    const sets = theme
      ? await legoData.getSetsByTheme(theme)
      : await legoData.getAllSets();
    if (sets.length === 0) {
      res.status(404).render("404", { message: "No sets found for the selected theme" });
    } else {
      res.render("sets", { sets });
    }
  } catch (error) {
    res.status(500).render("500", { message: "Internal Server Error" });
  }
});

app.get("/lego/sets/:num", async (req, res) => {
  try {
    const set = await legoData.getSetByNum(req.params.num);
    if (set) {
      res.render("set", { set });
    } else {
      res.status(404).render("404", { message: "Lego set not found" });
    }
  } catch (error) {
    res.status(500).render("500", { message: "Internal Server Error" });
  }
});

app.get('/lego/addSet', ensureLogin, async (req, res) => {
  try {
    const themes = await legoData.getAllThemes();
    res.render('addSet', { themes });
  } catch (error) {
    console.error('Error fetching themes:', error);
    res.status(500).render('500', { message: "Internal Server Error" });
  }
});

app.post('/lego/addSet', ensureLogin, async (req, res) => {
  try {
    await legoData.addSet(req.body);
    res.redirect('/lego/sets');
  } catch (error) {
    console.error('Error adding set:', error);
    res.status(500).render('500', { message: "Internal Server Error" });
  }
});

app.get('/lego/editSet/:num', ensureLogin, async (req, res) => {
  try {
    const set = await legoData.getSetByNum(req.params.num);
    const themes = await legoData.getAllThemes();
    res.render('editSet', { set, themes });
  } catch (error) {
    console.error('Error fetching set for edit:', error);
    res.status(404).send('Set not found');
  }
});

app.post('/lego/editSet', ensureLogin, async (req, res) => {
  try {
    const setNum = req.body.set_num;
    const setData = req.body;
    await legoData.editSet(setNum, setData);
    res.redirect(`/lego/sets/${setNum}`);
  } catch (error) {
    console.error('Error updating set:', error);
    res.status(500).render('500', { message: "Internal Server Error" });
  }
});

app.get('/lego/deleteSet/:num', ensureLogin, async (req, res) => {
  try {
    const setNum = req.params.num;
    await legoData.deleteSet(setNum);
    res.redirect('/lego/sets');
  } catch (error) {
    console.error('Error deleting set:', error);
    res.status(500).render('500', { message: "Internal Server Error" });
  }
});

app.get('/logout', (req, res) => {
  req.session.reset();
  res.redirect('/');
});

app.get('/userHistory', ensureLogin, (req, res) => {
  res.render('userHistory', { loginHistory: req.session.user.loginHistory });
});

// 404 Error handler
app.use((req, res) => {
  res.status(404).render("404", { message: "Page not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render("500", { message: "Internal Server Error" });
});

// Initialize data and start server
legoData.initialize()
  .then(authData.initialize)
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log(`Server running on: http://localhost:${HTTP_PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to start server:', err);
  });

module.exports = app;