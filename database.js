import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "1sukadmin",
  port: 3306,
  database: "db_test",
});

export default pool;
