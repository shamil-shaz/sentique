


// const express = require('express');
// const app = express();
// const path = require("path");
// const env = require('dotenv').config();
// const session=require("express-session")
// const db = require("./config/db");
// const passport=require("./config/passport")
// const userRouter = require("./routes/userRouter");
// const adminRouter=require('./routes/adminRouter')
// db();

// app.use(express.static(path.join(__dirname, 'public')));

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// app.use(session({
//     secret:process.env.SESSION_SECRET,
//     resave:false,
//     saveUninitialized:true,
//     cookie:{
//         secure:false,
//         httpOnly:true,
//         maxAge:72*60*60*1000
//     }
// }))

// app.use((req, res, next) => {
//   res.locals.user = req.session.user || null;
//   next();
// });


// app.set("view engine", "ejs");
// app.set("views", [
//     path.join(__dirname, 'views/user'),
//     path.join(__dirname, 'views/admin')
// ]);

// app.use("/", userRouter);

// app.use("/admin",adminRouter)

// app.use(session({
//   secret: 'yourSecretKey',
//   resave: false,
//   saveUninitialized: true
// }));

// app.use(passport.initialize());
// app.use(passport.session());






// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log("Server running on port " + PORT);
// });

// module.exports = app;



const express = require('express');
const app = express();
const path = require("path");
const env = require('dotenv').config();
const session = require("express-session");
const flash = require("connect-flash"); 
const db = require("./config/db");
const passport = require("./config/passport");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");

db();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Only one session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'yourSecretKey',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 72 * 60 * 60 * 1000
  }
}));

// ✅ Initialize flash
app.use(flash());

// ✅ Attach flash + user session to views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.successMessage = req.flash('success');
  res.locals.errorMessage = req.flash('error');
  next();
});

// ✅ Passport
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, 'views/user'),
  path.join(__dirname, 'views/admin')
]);

app.use("/", userRouter);
app.use("/admin", adminRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

module.exports = app;
