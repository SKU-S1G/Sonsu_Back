import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import {
  register,
  login,
  refreshToken,
  loginSuccess,
  logout,
} from "./controller/Login.js";
import {
  lessonLevel,
  lessonTopic,
  startLesson,
  CompleteLesson,
} from "./controller/Lesson.js";
import { checkQuiz, generateQuiz } from "./controller/Quiz.js";
import {
  lessonSaved,
  fetchSavedLesson,
  deleteSavedLesson,
} from "./controller/Review.js";
import authenticateToken from "./middlewares/authMiddleware.js";
import { Server as SocketIO } from "socket.io";
import {
  progressCategory,
  progressTopic,
  continueLesson,
} from "./controller/Progress.js";

dotenv.config();
const app = express();
const server = http.createServer(app);

const io = new SocketIO(server, {
  cors: {
    origin: ["http://192.168.45.70:3000", "http://localhost:8081"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/ws",
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on("connection", (socket) => {
  console.log("클라이언트 연결됨");

  socket.on("disconnect", () => {
    console.log("클라이언트 연결 종료됨");
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://192.168.45.217:8081", "http://localhost:8081"],
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

app.get("/lessons/:level_id/categories", lessonLevel);
app.get("/lessons/:category_id/topics", lessonTopic);
app.post("/lessons/start", authenticateToken, startLesson);
app.put("/lessons/complete", authenticateToken, CompleteLesson);

app.get("/quiz/generate", authenticateToken, generateQuiz);
app.post("/quiz/check", authenticateToken, checkQuiz);

app.post("/review/save", authenticateToken, lessonSaved);
app.get("/review/lessons", authenticateToken, fetchSavedLesson);
app.delete("/review/delete/:saveId", authenticateToken, deleteSavedLesson);

app.get("/progress/continue", authenticateToken, continueLesson);
app.post("/progress/categories", authenticateToken, progressCategory);
app.post("/progress/topics", authenticateToken, progressTopic);

server.listen(process.env.PORT, () => {
  console.log(`Listening on localhost: ${process.env.PORT}`);
});
