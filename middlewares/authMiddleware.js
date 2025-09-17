import jwt from "jsonwebtoken";

const authenticateToken = (req, res, next) => {
  //console.log("요청 URL:", req.originalUrl);
  //const token = req.cookies.accessToken;
  // //if (!token) return res.sendStatus(401);

  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return res.status(401).json({ message: "로그인 필요" });
  }

  jwt.verify(token, process.env.ACCESS_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "유효하지 않은 토큰" });
    req.user = user;
    req.user_id = user.id;
    req.role = user.role;
    next();
  });
};

const isAdmin = (req, res, next) => {
  //console.log("isAdmin :", req.user_id, req.role);
  if (!req.user_id || req.role !== "admin") {
    return res.status(403).json({ message: "관리자 권한이 필요합니다." });
  }
  next();
};

export default authenticateToken;
export { isAdmin };

/*
import jwt from "jsonwebtoken";

const authenticateToken = (req, res, next) => {
  //console.log("요청 URL:", req.originalUrl);
  const token = req.cookies.accessToken;
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    //req.user = { id: user.id, role: user.role };
    req.user_id = user.id;
    req.role = user.role;
    next();
  });
};
*/
