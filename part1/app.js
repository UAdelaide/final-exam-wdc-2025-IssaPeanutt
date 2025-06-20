var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

let db;

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '' // Adjust as needed
    });

    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.end();

    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });
app.get('/api/dogs', async (req, res) => {
      try {
        const [rows] = await db.execute(`
          SELECT d.name AS dog_name, d.size, u.username AS owner_username
          FROM Dogs d
          JOIN Users u ON d.owner_id = u.user_id
        `);
        res.json(rows);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get('/api/walkrequests/open', async (req, res) => {
      try {
        const [rows] = await db.execute(`
          SELECT wr.request_id, d.name AS dog_name, wr.requested_time,
                wr.duration_minutes, wr.location, u.username AS owner_username
          FROM WalkRequests wr
          JOIN Dogs d ON wr.dog_id = d.dog_id
          JOIN Users u ON d.owner_id = u.user_id
          WHERE wr.status = 'open'
        `);
        res.json(rows);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get('/api/walkers/summary', async (req, res) => {
      try {
        const [rows] = await db.execute(`
          SELECT
            u.username AS walker_username,
            COUNT(r.rating_id) AS total_ratings,
            ROUND(AVG(r.rating), 1) AS average_rating,
            COUNT(DISTINCT wr.request_id) AS completed_walks
          FROM Users u
          LEFT JOIN WalkRatings r ON u.user_id = r.walker_id
          LEFT JOIN WalkRequests wr ON r.request_id = wr.request_id AND wr.status = 'completed'
          WHERE u.role = 'walker'
          GROUP BY u.user_id
        `);
        res.json(rows);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    const PORT = 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

  } catch (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1); // Exit if connection fails
  }
})();

module.exports = app;