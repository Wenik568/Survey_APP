const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // Перевіряємо чи користувач вже існує
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            // Користувач вже існує
            return done(null, user);
        }

        // Перевіряємо чи існує користувач з таким email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            // Якщо користувач з таким email існує, прив'язуємо Google ID
            user.googleId = profile.id;
            if (!user.name && profile.displayName) {
                user.name = profile.displayName;
            }
            if (!user.isEmailVerified) {
                user.isEmailVerified = true; // Google підтвердив email
            }
            await user.save();
            return done(null, user);
        }

        // Створюємо нового користувача
        // Генеруємо username з email або імені
        const emailUsername = profile.emails[0].value.split('@')[0];
        let username = emailUsername;

        // Перевіряємо чи username вже існує
        let counter = 1;
        while (await User.findOne({ username })) {
            username = `${emailUsername}${counter}`;
            counter++;
        }

        const newUser = new User({
            googleId: profile.id,
            username: username,
            email: profile.emails[0].value,
            name: profile.displayName,
            isEmailVerified: true // Google вже верифікував email
        });

        await newUser.save();
        done(null, newUser);
    } catch (error) {
        console.error('Google OAuth error:', error);
        done(error, null);
    }
}));

module.exports = passport;