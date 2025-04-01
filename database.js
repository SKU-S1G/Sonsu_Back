import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "chldbwjd02",
  port: 3306,
  database: "sonsuTest",
});

export default pool;