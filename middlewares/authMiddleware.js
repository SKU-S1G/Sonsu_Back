import jwt from "jsonwebtoken";

const authenticateToken = (req, res, next) => {
  console.log("요청 URL:", req.originalUrl);
  const token = req.cookies.accessToken;
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user_id = user.id;
    next();
  });
};

export default authenticateToken;
