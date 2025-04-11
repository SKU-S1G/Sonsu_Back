import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "1sukadmin",
  database: "db_test",
  port: 3306,
});

export default pool;

// pool.query(`SHOW DATABASES;`, function (err, rows, fields) {
//   if (err) {
//     console.error(err);
//     return;
//   }
//   console.log(rows);
// });
