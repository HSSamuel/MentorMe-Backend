import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { PrismaClient, User } from "@prisma/client";

const prisma = new PrismaClient();

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/api/auth/google/callback",
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await prisma.user.findUnique({
          where: { email: profile.emails?.[0].value },
        });

        if (user) {
          // User exists, link googleId if not present
          if (!user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId: profile.id },
            });
          }
          return done(null, user);
        }

        // Create new user
        const newUser = await prisma.user.create({
          data: {
            email: profile.emails![0].value,
            googleId: profile.id,
            // Assuming the password can be null for social logins
            // You might need to adjust your Prisma schema for this
          },
        });

        // Create a basic profile for the new user
        await prisma.profile.create({
          data: {
            userId: newUser.id,
            name: profile.displayName,
          },
        });

        return done(null, newUser);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Facebook Strategy with enableProof
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID!,
      clientSecret: process.env.FACEBOOK_APP_SECRET!,
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails"],
      enableProof: true, // Add this line
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await prisma.user.findUnique({
          where: { email: profile.emails?.[0].value },
        });

        if (user) {
          // User exists, link facebookId if not present
          if (!user.facebookId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { facebookId: profile.id },
            });
          }
          return done(null, user);
        }

        // Create new user
        const newUser = await prisma.user.create({
          data: {
            email: profile.emails![0].value,
            facebookId: profile.id,
          },
        });

        // Create a basic profile for the new user
        await prisma.profile.create({
          data: {
            userId: newUser.id,
            name: profile.displayName,
          },
        });

        return done(null, newUser);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: id } });
    done(null, user);
  } catch (error) {
    done(error, false);
  }
});
