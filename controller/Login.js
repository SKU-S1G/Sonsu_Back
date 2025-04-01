import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../database.js";

export const register = async (req, res) => {
  const { username, loginId, password, confirmPassword, email } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "비밀번호가 일치하지 않습니다" });
  }

  try {
    const [existingUsers] = await pool.query(
      "SELECT user_id FROM users WHERE login_id = ? OR email = ?",
      [loginId, email]
    );

    if (existingUsers.length > 0) {
      return res
        .status(400)
        .json({ message: "이미 존재하는 아이디 또는 이메일입니다." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (username, login_id, password, email) VALUES (?, ?, ?, ?)",
      [username, loginId, hashedPassword, email]
    );
    res.status(201).json({ message: "회원가입 성공" });
  } catch (error) {
    // console.error("회원가입 오류:", error);
    res.status(500).json({ message: "회원가입 실패", error: error.message });
  }
};

export const login = async (req, res) => {
  const { loginId, password } = req.body;
  console.log("로그인 요청:", req.body);
  try {
    const [users] = await pool.query("SELECT * FROM users WHERE login_id = ?", [
      loginId,
    ]);
    const userInfo = users.find((user) => user.login_id === loginId);

    if (!userInfo || !(await bcrypt.compare(password, userInfo.password))) {
      return res.status(401).send("로그인 실패: 잘못된 아이디 또는 비밀번호");
    } else {
      try {
        const accessToken = jwt.sign(
          {
            id: userInfo.user_id,
            loginId: userInfo.login_id,
            email: userInfo.email,
          },
          process.env.ACCESS_SECRET,
          { expiresIn: "24m", issuer: "suk" }
        );

        const refreshToken = jwt.sign(
          {
            id: userInfo.user_id,
            loginId: userInfo.login_id,
            email: userInfo.email,
          },
          process.env.REFRESH_SECRET,
          { expiresIn: "24h", issuer: "suk" }
        );

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await pool.query(
          "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
          [userInfo.user_id, refreshToken, expiresAt]
        );

        res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: false,
          sameSite: "None",
        });

        res.status(200).json({
          message: "Login Success",
          userInfo,
          accessToken,
        });
      } catch (err) {
        res.status(500).json(err);
      }
    }
  } catch (error) {
    res.status(500).send("서버 오류: " + error.message);
  }
};

export const refreshToken = async (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) {
    return res.status(401).json({ message: "Access token 필요" });
  }
  try {
    const data = jwt.verify(token, process.env.ACCESS_SECRET);
    const [users] = await pool.query("SELECT * FROM users WHERE user_id = ?", [
      data.id,
    ]);

    const userData = users[0];
    if (!userData) {
      return res
        .status(404)
        .json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    const { password, ...others } = userData;
    res.status(200).json(others);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      try {
        const decoded = jwt.decode(token);
        if (!decoded) return res.status(401).json({ message: "잘못된 토큰" });
        const [rows] = await pool.query(
          "SELECT * FROM refresh_tokens WHERE user_id = ?",
          [decoded.id]
        );
        if (rows.length === 0) {
          return res.status(401).json({ message: "Refresh token 필요" });
        }

        const refreshToken = rows[0].token;

        try {
          const refreshTokenData = jwt.verify(
            refreshToken,
            process.env.REFRESH_SECRET
          );

          const newAccessToken = jwt.sign(
            {
              id: refreshTokenData.id,
              loginId: refreshTokenData.loginId,
              email: refreshTokenData.email,
            },
            process.env.ACCESS_SECRET,
            { expiresIn: "24m", issuer: "suk" }
          );

          res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: false,
          });

          return res.status(200).json({ accessToken: newAccessToken });
        } catch (refreshError) {
          await pool.query("DELETE FROM refresh_tokens WHERE user_id = ?", [
            decoded.id,
          ]);

          return res
            .status(401)
            .json({ message: "Refresh token 만료. 다시 로그인하세요." });
        }
      } catch (refreshQueryError) {
        return res.status(500).json({
          message: "Refresh token 검증 중 오류",
          error: refreshQueryError.message,
        });
      }
    } else {
      return res
        .status(500)
        .json({ message: "서버 오류", error: error.message });
    }
  }
};

export const loginSuccess = async (req, res) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ message: "로그인 필요" });
  }

  try {
    const data = jwt.verify(token, process.env.ACCESS_SECRET);

    const [users] = await pool.query("SELECT * FROM users WHERE user_id = ?", [
      data.id,
    ]);

    const userData = users[0];
    if (!userData) {
      return res
        .status(404)
        .json({ message: "사용자 정보를 찾을 수 없습니다." });
    }
    const { password, ...others } = userData;
    res.status(200).json(others);
  } catch (error) {
    return res.status(500).json({ message: "서버 오류", error: error.message });
  }
};

export const logout = async (req, res) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ message: "로그인 필요" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_SECRET);
    const userId = decoded.id;

    const [result] = await pool.query(
      "DELETE FROM refresh_tokens WHERE user_id = ?",
      [userId]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "해당 사용자에 대한 Refresh Token이 없습니다." });
    }

    res.clearCookie("accessToken", {
      path: "/",
      httpOnly: true,
      secure: false,
      sameStie: "None",
    });

    res.status(200).json({ message: "Logout Success" });
  } catch (error) {
    console.error("로그아웃 처리 중 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
};
