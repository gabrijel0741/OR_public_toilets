const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "bazepodataka",
  database: "OR_lab_db",
  port: 5433,
});

router.get("/api/v1/reviews", async (req, res) => {
  try{
    const result = await pool.query("SELECT * FROM reviews ORDER BY review_id ASC");
    if (result.rows.length === 0) {
      return res.status(404).json({ status: "Not found",message: "No reviews found", response: null });
    }
    return res.status(200).json({ status: "OK",message: "All reviews found", response: result.rows });
  }
  catch{
    res.status(500).json({ status: "Service unavailable",message: "Internal server error", response: null });
  }
});


router.post("/api/v1/reviews", async (req, res) => {
  const { review_user, review_user_rating, review_comment, toilet_id } = req.body;
  try {
    const checkToiletExists = await pool.query("SELECT * FROM toilets WHERE toilet_id = $1;", [toilet_id]);

    if (checkToiletExists.rows.length === 0) {
      return res.status(400).json({ status: "Bad Request", message: "Toilet with the given toilet_id doesn't exist", response: null });
    }

    const maxReviewIdResult = await pool.query("SELECT MAX(review_id) AS max_rev_id FROM reviews;");
    const maxReviewID = maxReviewIdResult.rows[0].max_rev_id;

    const sql = `INSERT INTO reviews (review_id, review_user, review_user_rating, review_comment, toilet_id)
                  VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
                  
    const result = await pool.query(sql, [maxReviewID + 1,review_user, review_user_rating, review_comment, toilet_id]);
    res.status(201).json({ status: "OK",message: "Successfully added a new review", response: result.rows[0]});
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "Service unavailable",message: "Internal server error", response: err });
  }
});

module.exports = router;
