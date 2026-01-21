
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
require('dotenv').config();


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://sentique.site/auth/google/callback",
      proxy: true,

    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("Google Profile:", profile);
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
         
          if (user.isBlocked) {
            return done(null, false, { message: "User is blocked. Please contact support." });
          }
          return done(null, user);
        } else {
          const newUser = new User({
            name: profile.displayName,
            email: profile.emails?.[0]?.value || "",
            googleId: profile.id,
            isBlocked: false,
          });

          await newUser.save();
          return done(null, newUser);
        }
      } catch (error) {
        return done(error, null);
      }
    }
  )
);


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
