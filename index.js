import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import {
  register,
  login,
  refreshToken,
  loginSuccess,
  logout,
} from "./controller/Login.js";

const app = express();
dotenv.config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://192.168.45.237:3000",
      "http://192.168.45.237:8081",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send("Hello, Express!!!");
});

app.post("/register", register);
app.post("/login", login);
app.get("/refreshToken", refreshToken);
app.get("/login/success", loginSuccess);
app.post("/logout", logout);

app.listen(process.env.PORT, () => {
  console.log(`Listening on localhost: ${process.env.PORT}`);
});
