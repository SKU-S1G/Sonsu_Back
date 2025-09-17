import pool from "../database.js";
import { generateCode } from "../utils/Code.js";

export const generateClass = async (req, res) => {
  const { className, description, colorId } = req.body;
  const adminId = req.user_id;
  const classCode = generateCode();

  try {
    const [result] = await pool.query(
      `INSERT INTO classes (class_name, admin_id, description, color_id, class_code)
       VALUES (?, ?, ?, ?, ?)`,
      [className, adminId, description, colorId, classCode]
    );

    return res.status(201).json({
      message: "클래스가 성공적으로 생성하였습니다.",
      class_id: result.insertId,
      class_code: classCode,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "클래스 생성 실패" });
  }
};

export const selectClass = async (req, res) => {
  const { classId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT class_id, class_name, description, class_code, cl.color_hex
      FROM classes c
      JOIN colors cl ON c.color_id = cl.color_id
      WHERE class_id = ? `,
      [classId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "클래스를 찾을 수 없습니다." });
    }
    res.status(200).json({
      message: "클래스 불러오는데 성공하였습니다.",
      data: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "클래스 불러오는데 실패하였습니다." });
  }
};

export const selectClassAll = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT class_id, class_name, description, class_code, cl.color_hex
      FROM classes c
      JOIN colors cl ON c.color_id = cl.color_id;`
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "클래스를 찾을 수 없습니다." });
    }
    res.status(200).json({
      message: "전체 클래스 불러오는데 성공하였습니다.",
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "클래스 불러오는데 실패하였습니다." });
  }
};

export const editClass = async (req, res) => {
  const { classId } = req.params;
  const { className, description, colorId } = req.body;

  const fields = [];
  const values = [];

  try {
    if (className !== undefined) {
      fields.push("class_name = ?");
      values.push(className);
    }

    if (description != undefined) {
      fields.push("description = ?");
      values.push(description);
    }

    if (colorId !== undefined) {
      fields.push("color_id = ?");
      values.push(colorId);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "수정할 값이 없습니다." });
    }

    values.push(classId);

    const [result] = await pool.query(
      `UPDATE classes SET ${fields.join(",")} WHERE class_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "해당 클래스가 존재하지 않습니다." });
    }
    return res.status(200).json({ message: "클래스 수정이 완료되었습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "클래스 수정실패" });
  }
};

export const deleteClass = async (req, res) => {
  const { classId } = req.params;

  try {
    const [result] = await pool.query(
      `DELETE FROM classes WHERE class_id = ?`,
      [classId]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "해당 클래스가 존재하지 않습니다." });
    }

    return res
      .status(200)
      .json({ message: "클래스가 성공적으로 삭제되었습니다." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "클래스 삭제 실패" });
  }
};

export const inviteClass = async (req, res) => {
  const { classId } = req.params;
  const { memberIds } = req.body;

  if (!Array.isArray(memberIds) || memberIds.length == 0) {
    return res
      .status(400)
      .json({ message: "클래스와 멤버를 모두 선택해주세요" });
  }

  try {
    const uq_mems = [...new Set(memberIds)];
    const values = uq_mems.map((id) => [classId, id]);
    const [result] = await pool.query(
      `INSERT INTO class_groups(class_id, member_id) VALUES ?`,
      [values]
    );
    return res
      .status(201)
      .json({ message: "성공적으로 멤버가 추가되었습니다." });
    /*
      return res
      .status(201)
      .json({ message: "성공적으로 멤버가 추가되었습니다.", invited: uq_mems });
      */
  } catch (err) {
    console.error(err);
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ message: "이미 초대된 멤버가 포함되어 있습니다." });
    }

    return res.status(500).json({ message: "멤버 초대 실패" });
  }
};

export const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT user_id, username FROM users WHERE role = 'user'`
    );

    res.status(200).json({
      message: "유저 목록 불러오기 성공했습니다.",
      users: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "유저 목록 불러오기 실패했습니다." });
  }
};

export const addLessons = async (req, res) => {
  const { classId } = req.params;
  const { lessonIds } = req.body;

  if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
    return res.status(400).json({ message: "레슨을 선택해주세요." });
  }

  try {
    const uq_Lessons = [...new Set(lessonIds)];
    const values = uq_Lessons.map((lessonId) => [classId, lessonId]);

    await pool.query(
      `INSERT INTO class_lessons (class_id, lesson_id) VALUES ?`,
      [values]
    );

    return res.status(201).json({
      message: "성공적으로 레슨이 클래스에 추가되었습니다.",
    });
  } catch (err) {
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        message: "이미 추가된 레슨이 포함되어 있습니다.",
      });
    }

    return res.status(500).json({ message: "레슨 추가 실패" });
  }
};

export const deletelessons = async (req, res) => {
  const { classId } = req.params;
  const { lessonIds } = req.body;

  if (!Array.isArray(lessonIds) && lessonIds.length == 0) {
    return res.status(400).json({ message: "삭제할 레슨을 선택해주세요" });
  }

  try {
    const result = await pool.query(
      `DELETE FROM class_lessons WHERE class_id = ? AND lesson_id in (?)`,
      [classId, lessonIds]
    );
    return res.status(200).json({ message: "성공적으로 레슨을 삭제했습니다." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "삭제 실패하였습니다." });
  }
};
/*
export const selectLessons = async (req, res) => {
  const memberId = req.user_id;

  try {
    const [rows] = await pool.query(
      `
    SELECT cl.class_id, cg.member_id, l.word, l.animation_path, lc.part_number, lc.category,
    ROW_NUMBER() OVER (PARTITION BY lc.lessonCategory_id ORDER BY l.step_number ASC) AS step_number
    FROM class_lessons cl
    JOIN class_groups cg ON cl.class_id = cg.class_id
    JOIN lessons l ON cl.lesson_id = l.lesson_id
    JOIN lesson_categories lc ON l.lessonCategory_id = lc.lessonCategory_id
    WHERE cg.member_id = ?;
    `,
      [memberId]
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "불러오기 실패하였습니다." });
  }
};
*/

export const selLessonsUser = async (req, res) => {
  const memberId = req.user_id;

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        cl.class_id, 
        cg.member_id, 
        l.lesson_id,
        l.word, 
        l.animation_path, 
        lc.lessonCategory_id,
        lc.part_number, 
        lc.category,
        ROW_NUMBER() OVER (PARTITION BY l.lessonCategory_id ORDER BY cl.created_at ASC) AS step_number
      FROM class_lessons cl
      JOIN class_groups cg ON cl.class_id = cg.class_id
      JOIN lessons l ON cl.lesson_id = l.lesson_id
      JOIN lesson_categories lc ON l.lessonCategory_id = lc.lessonCategory_id
      WHERE cg.member_id = ?;
      `,
      [memberId]
    );

    const grouped = rows.reduce((acc, row) => {
      const categoryId = row.lessonCategory_id;
      if (!acc[categoryId]) {
        acc[categoryId] = {
          id: categoryId,
          categoryName: row.category,
          partNumber: row.part_number,
          lessons: [],
        };
      }

      acc[categoryId].lessons.push({
        lessonId: row.lesson_id,
        word: row.word,
        animationPath: row.animation_path,
        stepNumber: row.step_number,
      });

      return acc;
    }, {});

    return res.status(200).json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "불러오기 실패하였습니다." });
  }
};

export const selLessonsAdmin = async (req, res) => {
  const { classId } = req.params;

  try {
    const [rows] = await pool.query(
      `
    SELECT cl.class_id, cg.member_id, l.lesson_id, l.word, l.animation_path, lc.lessonCategory_id, lc.part_number, lc.category,
    ROW_NUMBER() OVER (PARTITION BY l.lessonCategory_id ORDER BY cl.created_at ASC) AS step_number
    FROM class_lessons cl
    JOIN class_groups cg ON cl.class_id = cg.class_id
    JOIN lessons l ON cl.lesson_id = l.lesson_id
    JOIN lesson_categories lc ON l.lessonCategory_id = lc.lessonCategory_id
    WHERE cg.class_id = ?;
      `,
      [classId]
    );

    const grouped = rows.reduce((acc, row) => {
      const categoryId = row.lessonCategory_id;
      if (!acc[categoryId]) {
        acc[categoryId] = {
          id: categoryId,
          categoryName: row.category,
          partNumber: row.part_number,
          lessons: [],
        };
      }

      acc[categoryId].lessons.push({
        lessonId: row.lesson_id,
        word: row.word,
        animationPath: row.animation_path,
        stepNumber: row.step_number,
      });

      return acc;
    }, {});

    return res.status(200).json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "불러오기 실패하였습니다." });
  }
};

export const addCategories = async (req, res) => {
  const { classId } = req.params;
  const { categoryIds } = req.body;

  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    return res.status(400).json({ message: "카테고리를 선택해주세요." });
  }

  try {
    const uq_Categories = [...new Set(categoryIds)];

    const [lessons] = await pool.query(
      `SELECT lesson_id, lessonCategory_id 
       FROM lessons 
       WHERE lessonCategory_id IN (?)`,
      [uq_Categories]
    );

    if (lessons.length === 0) {
      return res
        .status(404)
        .json({ message: "해당 카테고리에 레슨이 없습니다." });
    }

    const values = lessons.map((l) => [classId, l.lesson_id]);

    await pool.query(
      `INSERT INTO class_lessons (class_id, lesson_id) VALUES ?`,
      [values]
    );

    return res.status(201).json({
      message: "해당 레슨들이 클래스에 추가되었습니다.",
    });
  } catch (err) {
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        message: "이미 추가된 카테고리/레슨이 포함되어 있습니다.",
      });
    }

    return res.status(500).json({ message: "카테고리 추가 실패" });
  }
};

export const getUsersClass = async (req, res) => {
  const { classId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT class_id, member_id, username
       FROM class_groups cg
       JOIN users u ON u.user_id = cg.member_id
       WHERE class_id = ?`,
      [classId]
    );

    return res.status(200).json({
      message: "사용자 정보를 불러왔습니다.",
      users: rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "사용자 정보 불러오기 실패" });
  }
};

export const deleteUserClass = async (req, res) => {
  const { classId } = req.params;
  const { memberIds } = req.body;

  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ message: "삭제할 사용자를 선택해주세요." });
  }

  try {
    const result = await pool.query(
      `DELETE FROM class_groups WHERE class_id = ? AND member_id IN (?)`,
      [classId, memberIds]
    );

    return res.status(200).json({ message: "사용자 삭제 성공했습니다." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "사용자 삭제 실패" });
  }
};
