
const express = require('express');
const path = require('path');
const dotenv = require('dotenv').config({ debug: true });
const session = require('express-session');
const flash = require('connect-flash');
const nocache = require('nocache');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport');
const db = require('./config/db');

const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter');

(async () => {
  try {
    await db(); 
    const app = express();

    // --------------- MIDDLEWARE ---------------
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    app.set('view engine', 'ejs');
    app.set('views', [
      path.join(__dirname, 'views/user'),
      path.join(__dirname, 'views/admin'),
    ]);
    

    // --------------- SESSION STORE ---------------
    const sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sentique",
      ttl: 7 * 24 * 60 * 60, 
      autoRemove: 'native',
      crypto: {
        secret: process.env.SESSION_SECRET || 'super_secret_sentique_key',
      },
    });

    console.log('Session store initialized successfully');


    // --------------- USER SESSION ---------------
    app.use("/", session({
      name: "userSession",
      secret: process.env.SESSION_SECRET || "super_secret_sentique_key",
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: { maxAge: 1000 * 60 * 60 * 24 * 7, httpOnly: true, sameSite: "lax" }
    }));


    // --------------- ADMIN SESSION ---------------
    app.use("/admin", session({
      name: "adminSession",
      secret: process.env.ADMIN_SESSION_SECRET || "admin_secret",
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: { maxAge: 1000 * 60 * 60 * 24 * 7, httpOnly: true, sameSite: "lax" }
    }));


    // --------------- FLASH & NOCACHE ---------------
    app.use(flash());
    app.use(nocache());
    
    app.use((req, res, next) => {
      res.locals.success_msg = req.flash("success") || [];
      res.locals.error_msg = req.flash("error") || [];
      res.locals.user = req.session.user || null;
      next();
    });


    // --------------- PASSPORT ---------------
    app.use(passport.initialize());
    app.use(passport.session());


    // --------------- ROUTES ---------------
    app.use("/", userRouter);
    app.use("/admin", adminRouter);


    // --------------- 404 HANDLER ---------------
    app.use((req, res) => {
      res.status(404).render("page-404", { status: 404, message: "Page not found" });
    });


    // --------------- START SERVER ---------------
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () =>
      console.log(` Server running on port ${PORT} (Node.js v${process.version})`)
    );

    server.on('error', (err) => console.error('Server error:', err.message));

  } catch (error) {
    console.error(' Application startup error:', error);
    process.exit(1);
  }
})();
