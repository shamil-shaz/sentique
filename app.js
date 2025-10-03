
const express = require('express');
const app = express();
const path = require("path");
const env = require('dotenv').config();
const session = require("express-session");
const flash = require("connect-flash"); 
const db = require("./config/db");
const passport = require("./config/passport");
const nocache = require('nocache');
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const MongoStore = require("connect-mongo");

db();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(
  session({
    name: "userSession",
    secret: process.env.SESSION_SECRET || "super_secret_sentique_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sentique"
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "lax",
    },
  })
);  


app.use(
  "/admin",
  session({
    name: "adminSession",
    secret: process.env.ADMIN_SESSION_SECRET || "admin_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sentique"
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "lax",
    },
  })
);


app.use(flash());

app.use(nocache());

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.successMessage = req.flash('success');
  res.locals.errorMessage = req.flash('error');
  next();
});


app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, 'views/user'),
  path.join(__dirname, 'views/admin')
]);

app.use("/", userRouter);
app.use("/admin", adminRouter);

app.use((req, res, next) => {
  res.status(404).render("page-404", {
    status: 404,
    message: "Page not found"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});


module.exports = app;
