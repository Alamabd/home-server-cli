const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "phpmyadmin",
  password: "root",
  database: "myhome"
});

module.exports = pool;
