const express = require('express');
const app = express();
const path = require('path');
const pg = require('pg')
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)
const {Pool} = require('pg');
const cors = require('cors');

const swaggerUI = require("swagger-ui-express");
const toiletsRouter = require("./routes/toilets");
const reviewsRouter = require("./routes/reviews");
const openapi = require("./openapi.json");


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(cors())

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'bazepodataka',
  database: 'OR_lab_db',
  port: 5433,
});

app.get("/database", async (req, res) => {
  try {
    let { filter_parameters, filter } = req.query;

    if (filter_parameters == "all values") {
        if(filter == ""){
            const result = await pool.query("SELECT * FROM toilets LEFT JOIN reviews USING(toilet_id) ORDER BY review_id ASC");
            return res.json(result.rows);
        }
        else{
            let parsedFloatFilter = parseFloat(filter);
            let filterNum = isNaN(parsedFloatFilter) ? -123456789 : parsedFloatFilter;
            const result = await pool.query("SELECT * \
                                            FROM toilets LEFT JOIN reviews USING(toilet_id) \
                                            WHERE name LIKE '%" + filter + "%' or \
                                                city LIKE '%" + filter + "%' or \
                                                address LIKE '%" + filter + "%' or \
                                                latitude = " + filterNum + " or \
                                                longitude = " + filterNum + " or \
                                                regular_toilets = " + filterNum + " or \
                                                urinals = " + filterNum + " or \
                                                disabled_toilets = " + filterNum + " or \
                                                review_user_rating = " + filterNum + " or \
                                                fee_amount = " + filterNum + " or \
                                                postal_code LIKE '%" + filter + "%' or \
                                                working_hours LIKE '%" + filter + "%' or \
                                                review_user LIKE '%" + filter + "%' or \
                                                review_comment LIKE '%" + filter + "%' \
                                            ORDER BY review_id ASC");
            return res.json(result.rows);
        }
      
    }
    else{
        if(["name","city","address","postal_code", "working_hours","review_user", "review_comment"].includes(filter_parameters)){
            const result = await pool.query("SELECT * FROM toilets LEFT JOIN reviews USING(toilet_id) \
                WHERE " + filter_parameters + " LIKE '%" + filter + "%' ORDER BY review_id ASC");
            return res.json(result.rows);
        }
        else{
            const parsedFloatFilter = parseFloat(filter);
            const result = await pool.query("SELECT * FROM toilets LEFT JOIN reviews USING(toilet_id) \
                WHERE " + filter_parameters + " = " + parsedFloatFilter + " ORDER BY review_id ASC");
            return res.json(result.rows);
        }

    }
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use(toiletsRouter)
app.use(reviewsRouter)
app.use("/api/v1/api-docs", swaggerUI.serve, swaggerUI.setup(openapi));

app.listen(3000, () => {
  console.log(`Server running at http://localhost:3000`);
});