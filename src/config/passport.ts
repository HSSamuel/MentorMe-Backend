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
        const userEmail = profile.emails?.[0].value;
        const googleId = profile.id;
        const displayName = profile.displayName;

        // Ensure an email address is returned from Google, which is required by your schema.
        if (!userEmail) {
          return done(
            new Error("No email address found from Google profile."),
            false
          );
        }

        // 1. Find user by their unique Google ID first. This handles a returning user.
        let user = await prisma.user.findUnique({
          where: { googleId: googleId },
        });

        if (user) {
          // If user is found, this is a login. Return the user.
          return done(null, user);
        }

        // 2. If no user with that Google ID, check if the email is already in use.
        // This handles a user who first signed up with email/password and now uses Google.
        user = await prisma.user.findUnique({
          where: { email: userEmail },
        });

        if (user) {
          // User exists, so link their Google ID to the existing account.
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId: googleId },
          });
          return done(null, user);
        }

        // 3. If no user is found by Google ID or email, it's a new user. Create them.
        const newUser = await prisma.user.create({
          data: {
            email: userEmail,
            googleId: googleId,
            profile: {
              create: {
                name: displayName,
              },
            },
          },
        });

        return done(null, newUser);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Facebook Strategy with the same robust logic
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID!,
      clientSecret: process.env.FACEBOOK_APP_SECRET!,
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails"],
      enableProof: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const userEmail = profile.emails?.[0].value;
        if (!userEmail) {
          return done(
            new Error("No email address found from Facebook profile."),
            false
          );
        }

        let user = await prisma.user.findUnique({
          where: { facebookId: profile.id },
        });

        if (user) {
          return done(null, user);
        }

        user = await prisma.user.findUnique({
          where: { email: userEmail },
        });

        if (user) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { facebookId: profile.id },
          });
          return done(null, user);
        }

        const newUser = await prisma.user.create({
          data: {
            email: userEmail,
            facebookId: profile.id,
            profile: {
              create: {
                name: profile.displayName,
              },
            },
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
