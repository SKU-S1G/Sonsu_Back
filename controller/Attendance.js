import pool from "../database.js";

export const attendance = async (req, res) => {
  const userId = req.user_id;

  if (!userId) {
    return res.status(400).json({ message: "사용자 ID가 필요합니다" });
  }

  try {
    // 사용자의 출석 기록 조회
    const [rows] = await pool.query(
      "SELECT * FROM attendances WHERE user_id = ?",
      [userId]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("출석 기록 조회 중 오류 발생:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};
