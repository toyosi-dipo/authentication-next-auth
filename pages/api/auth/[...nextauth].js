import NextAuth from "next-auth/next";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import mongoClient from "../../../utils/mongodb/mongoConnect";
import { verifyPassword } from "../../../utils/auth/passwordHandler";

export const authOptions = {
  // providers
  providers: [
    Credentials({
      async authorize(credentials) {
        const { email_username, password } = credentials;

        // check if email or username is used
        const isEmail = email_username.includes("@");

        // check length of password
        if (password.length < 7) {
          throw new Error(
            `Incorrect ${isEmail ? "email" : "username"} or password.`
          );
        }

        // connect to database
        let user, client;
        try {
          client = await mongoClient();
          const db = client.db("auth-demo");
          // choosing a specific collection from the database
          const usersCollection = db.collection("users");

          // find user from collection
          if (isEmail) {
            user = await usersCollection.findOne({
              email: email_username.toLowerCase(),
            });
          } else {
            user = await usersCollection.findOne({
              username: email_username.toLowerCase(),
            });
          }
        } catch (error) {
          // close client if connected already
          if (client) {
            client.close();
          }
          throw new Error("Error occurred! Check your network connection.");
        }

        // if user is not found
        if (!user) {
          throw new Error(
            `User does not exist! Check provided ${
              isEmail ? "email." : "username."
            }`
          );
        }
        // verify password
        const isPasswordCorrect = await verifyPassword(password, user.password);
        // if password is not correct
        if (!isPasswordCorrect) {
          throw new Error(
            `Incorrect ${isEmail ? "email" : "username"} or password.`
          );
        }

        return { name: user.username, email: user.email };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
};

export default NextAuth(authOptions);
