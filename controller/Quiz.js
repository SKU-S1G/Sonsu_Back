import pool from "../database.js";

export const generateQuiz = async (req, res) => {
  const userId = req.user_id;
  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "userId가 필요합니다." });
  }

  try {
    const bucketName = "sonsustorage.firebasestorage.app";

    const [lessonData] = await pool.query(
      `SELECT ul.userLesson_id, l.lesson_id, l.word
             FROM user_lessons ul
             JOIN lessons l ON ul.lesson_id = l.lesson_id
             WHERE ul.user_id = ? 
             AND DATE(ul.lesson_date) = '2025-04-01'
             AND ul.status = 'completed'
             ORDER BY RAND()  
             LIMIT 5`,
      [userId]
    );

    if (lessonData.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "오늘 학습한 단어가 없습니다." });
    }

    // OX 퀴즈 생성
    const [randomLessons] = await pool.query(
      `SELECT word FROM lessons ORDER BY RAND() LIMIT 5`
    );

    const quizData = lessonData.map((lesson, index) => {
      const isCorrect = Math.random() < 0.5;
      const wrongWord = randomLessons[index]?.word || "잘못된 단어";
      return {
        question: `${lesson.word}\n'${isCorrect ? lesson.word : wrongWord}'`,
        check_answer: isCorrect,
        lesson_id: lesson.lesson_id,
      };
    });

    const [sessionResult] = await pool.query(
      "INSERT INTO quiz_sessions (user_id) VALUES (?)",
      [userId]
    );
    const sessionId = sessionResult.insertId;

    const quizInsertQuery = `INSERT INTO quizzes (session_id, userLesson_id, question, check_answer) VALUES ?`;
    const quizValues = quizData.map((quiz, index) => [
      sessionId,
      lessonData[index].userLesson_id,
      quiz.question,
      quiz.check_answer ? 1 : 0,
    ]);
    await pool.query(quizInsertQuery, [quizValues]);

    const [quizIds] = await pool.query(
      `SELECT quiz_id FROM quizzes WHERE session_id = ?`,
      [sessionId]
    );

    const quizIdData = quizData.map((quiz, index) => ({
      ...quiz,
      quiz_id: quizIds[index]?.quiz_id,
    }));

    const lessonIds = quizData.map((q) => q.lesson_id);
    const [animationData] = await pool.query(
      `SELECT lesson_id, animation_path FROM lessons WHERE lesson_id IN (?)`,
      [lessonIds]
    );

    const animation = animationData.reduce((acc, item) => {
      if (item.animation_path.startsWith("gs://")) {
        let fileName = encodeURIComponent(item.animation_path.split("/").pop());
        acc[
          item.lesson_id
        ] = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${fileName}?alt=media`;
      } else {
        acc[item.lesson_id] = item.animation_path;
      }
      return acc;
    }, {});

    const OX_quiz = quizIdData.map((quiz) => ({
      ...quiz,
      animation_path: animation[quiz.lesson_id] || null,
    }));

    res.json({ success: true, sessionId, quizzes: OX_quiz });
  } catch (error) {
    console.error("OX 퀴즈 생성 오류:", error);
    res.status(500).json({ success: false, message: "OX 퀴즈 생성 실패" });
  }
};

export const checkQuiz = async (req, res) => {
  const { sessionId, answers } = req.body;
  const userId = req.user_id;

  if (!sessionId || !Array.isArray(answers) || !userId) {
    return res.status(400).json({
      success: false,
      message: "잘못된 요청입니다.",
    });
  }

  try {
    const [quizData] = await pool.query(
      `SELECT quiz_id, check_answer FROM quizzes WHERE session_id = ?`,
      [sessionId]
    );

    console.log("쿼리 결과:", quizData);

    if (quizData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "해당 세션의 퀴즈를 찾을 수 없습니다.",
      });
    }

    if (answers.length !== quizData.length) {
      return res.status(400).json({
        success: false,
        message: "제출한 답안 개수가 퀴즈 개수와 맞지 않습니다.",
      });
    }

    const results = quizData.map((quiz) => {
      const userAnswer = answers.find((a) => a.quiz_id === quiz.quiz_id);
      const isCorrect =
        userAnswer &&
        typeof userAnswer.answer === "boolean" &&
        quiz.check_answer === (userAnswer.answer ? 1 : 0); // 수정된 부분

      return {
        quiz_id: quiz.quiz_id,
        isCorrect,
        message: isCorrect ? "정답" : "오답",
      };
    });

    const score = results.filter((result) => result.isCorrect).length;

    await pool.query(
      `INSERT INTO quiz_scores (user_id, session_id, correct_count, total_questions) VALUES (?, ?, ?, ?)`,
      [userId, sessionId, score, quizData.length]
    );

    res.json({
      success: true,
      score,
      total: quizData.length,
      results,
    });
  } catch (error) {
    console.error("퀴즈 채점 오류:", error);
    res.status(500).json({ success: false, message: "채점 실패" });
  }
};
