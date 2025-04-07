import pool from "../database.js";
import { fetchProgressCategory } from "../utils/Progress.js";

export const lessonLevel = async (req, res) => {
  const levelId = req.params.level_id;
  try {
    const [results] = await pool.query(
      "SELECT * FROM lesson_categories WHERE lessonLevel_id = ?",
      [levelId]
    );
    res.json(results);
    // console.log(results);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
};

export const lessonTopic = async (req, res) => {
  const categoryId = req.params.category_id;
  const bucketName = "sonsustorage.firebasestorage.app";

  try {
    const [results] = await pool.query(
      "SELECT * FROM lessons WHERE lessonCategory_id = ?",
      [categoryId]
    );

    const updatedResults = results.map((lesson) => {
      if (lesson.animation_path.startsWith("gs://")) {
        let fileName = lesson.animation_path.split("/").pop();
        lesson.animation_path = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${fileName}?alt=media`;
      }
      return lesson;
    });
    res.json(updatedResults);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
};

export const startLesson = async (req, res) => {
  const userId = req.user_id;
  const { lessonId } = req.body;
  console.log("유저정보:", userId);

  if (!lessonId) {
    return res.status(400).json({ message: "lessonId가 제공되지 않았습니다." });
  }

  try {
    // lessonCategory_id 가져오기
    const [lessonInfo] = await pool.query(
      "SELECT lessonCategory_id FROM lessons WHERE lesson_id = ?",
      [lessonId]
    );

    if (lessonInfo.length === 0) {
      return res.status(404).json({ message: "존재하지 않는 강의입니다." });
    }

    const lessonCategoryId = lessonInfo[0].lessonCategory_id;

    // 중복 확인 (이미 진행 중이거나 완료된 강의)
    const [existing] = await pool.query(
      "SELECT * FROM user_lessons WHERE user_id = ? AND lesson_id = ?",
      [userId, lessonId]
    );

    if (existing.length > 0) {
      if (existing[0].status === "in_progress") {
        return res.status(200).json({ message: "강의는 이미 진행 중입니다." });
      }
      if (existing[0].status === "completed") {
        return res.status(200).json({ message: "강의는 이미 완료되었습니다." });
      }
    }

    // INSERT 시 lessonCategory_id 추가
    await pool.query(
      "INSERT INTO user_lessons (user_id, lesson_id, lessonCategory_id, status) VALUES (?, ?, ?, 'in_progress')",
      [userId, lessonId, lessonCategoryId]
    );

    res.status(201).json({ message: "강의 시작" });
  } catch (err) {
    console.error("서버 오류 발생:", err);
    return res
      .status(500)
      .json({ message: "서버 오류 발생", error: err.message });
  }
};

export const CompleteLesson = async (req, res) => {
  const userId = req.user_id;
  const { lessonId } = req.body;

  try {
    const [result] = await pool.query(
      "UPDATE user_lessons SET status = 'completed' WHERE user_id = ? AND lesson_id = ?",
      [userId, lessonId]
    );

    const completedCategories = await fetchProgressCategory(userId);
    // console.log("progressCategory 결과:", completedCategories);

    if (!completedCategories) {
      return res
        .status(500)
        .json({ error: "카테고리 정보를 가져오는 데 실패했습니다." });
    }
    //웹소켓
    if (req.io) {
      req.io.emit("categoryUpdated", completedCategories);
      // console.log("이벤트 전송됨", completedCategories);
    } else {
      console.error("WebSocket(io) 객체가 정의되지 않음");
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "해당 학습 기록을 찾을 수 없습니다." });
    }

    // 출석 처리
    await pool.query(
      `INSERT INTO attendances (user_id, attend_date)
         VALUES (?, CURDATE())
         ON DUPLICATE KEY UPDATE status = TRUE`,
      [userId]
    );

    // 완료된 강의 정보를 가져오기
    const [completedLessons] = await pool.query(
      `SELECT lesson_id, status FROM user_lessons WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );

    // 완료된 강의 정보를 웹소켓으로 전송
    if (req.io) {
      req.io.emit("progressUpdated", completedLessons);
      console.log("수업 완료 이벤트 전송됨", completedLessons);
    } else {
      console.error("WebSocket(io) 객체가 정의되지 않음");
    }

    res.status(200).json({ message: "수강 완료" });
  } catch (err) {
    console.error("서버 오류:", err);
    return res.status(500).json({ error: "서버 오류" });
  }
};
