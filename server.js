const express = require('express');
const app = express();
const path = require('path');
const pg = require('pg')
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)
const {Pool} = require('pg');
const cors = require('cors');
const fs = require('fs');
const { Parser } = require('json2csv');

const swaggerUI = require("swagger-ui-express");
const toiletsRouter = require("./routes/toilets");
const reviewsRouter = require("./routes/reviews");
const openapi = require("./openapi.json");
const { auth } = require('express-openid-connect');


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

app.use(
  auth({
    authRequired: false,
    auth0Logout: false,
    secret: 'wMBXDFnTTcbOTdkaG960kW7LW6VQkT3nRTNCvBJE5Es=',
    baseURL: 'http://localhost:3000',
    clientID: '3UHT42KJ54SbzHSsoRr1GXscRKnoskOd',
    issuerBaseURL: 'https://dev-mh7x5cvbbimmwafn.us.auth0.com'
  })
);

const requireAuth = (req, res, next) => {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).send('Unauthorized');
  }
  next();
};

app.get('/', (req, res) => {
  res.render('index', {
    isAuthenticated: req.oidc.isAuthenticated()
  });
});

app.get('/profile', requireAuth, (req, res) => {
  res.render('profile', {
    user: req.oidc.user
  });
});

app.get('/export', requireAuth, async (req, res) => {
    try{
        const result = await pool.query("SELECT * FROM toilets LEFT JOIN reviews USING(toilet_id) ORDER BY review_id ASC");
        const data = result.rows;

        if (data.length === 0) {
          return res.status(404).json({ status: "Not found",message: "Nije pronađen nijedan toalet", response: null });
        }

        //preuzimanje JSON datoteke
        const jsonLdData = data.map(toilet => ({
            "@context": {
                "place": "https://schema.org/Place",
                "address": "https://schema.org/PostalAddress",
                "geo": "https://schema.org/GeoCoordinates",
                "review": "https://schema.org/Review"
            },
            "name": toilet.name,
            "toilet_id": toilet.toilet_id,
            "regular_toilets": toilet.regular_toilets,
            "urinals": toilet.urinals,
            "toilets_for_disabled": toilet.toilets_for_disabled,
            "disabled_toilets": toilet.disabled_toilets,
            "fee_amount": toilet.fee_amount,
            "working_hours": toilet.working_hours,
            "unisex": toilet.unisex,
            "baby_changing_station": toilet.baby_changing_station,
            "maintenance": toilet.maintenance,
            "last_date_renovated": toilet.last_date_renovated,
            "free_of_charge": toilet.free_of_charge,
            "fee_amount": toilet.fee_amount,
            "place":{
                "address": {
                    "streetAddress": toilet.address,
                    "addressLocality": toilet.city,
                    "postalCode": toilet.postal_code
                },
                "geo": {
                    "latitude": toilet.latitude,
                    "longitude": toilet.longitude
                },
            },
            "review": {
                "identifier": toilet.review_id,
                "name": toilet.review_user,
                "contentRating": toilet.review_user_rating,
                "comment": toilet.review_comment
            }
        }));

        fs.writeFileSync(
            path.join(__dirname, 'exports', 'public_toilets.json'),
            JSON.stringify(jsonLdData, null, 4)
        );

        //preuzimanje CSV datoteke
        const parser = new Parser();
        fs.writeFileSync(
            path.join(__dirname, 'exports', 'public_toilets.csv'),
            parser.parse(data)
        );

        res.status(200).json({ status: "OK",message: "Svi toaleti uspješno preuzeti u folder /exports", response: jsonLdData });
    }
    catch (err){
        console.error("Error exporting data:", err);
        res.status(500).json({ status: "Service unavailable",message: "Internal server error", response: null });
    }
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