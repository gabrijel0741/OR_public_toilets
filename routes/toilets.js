const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const { route } = require("./reviews");

const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "bazepodataka",
  database: "OR_lab_db",
  port: 5433,
});

function isValidPostalCode(postal_code) {
  return typeof postal_code === 'string' && postal_code.length <= 5;
}

function isValidDateFormat(dateString) {
  if (typeof dateString !== "string"){
    return false;
  }

  const dijelovi = dateString.split("-");
  if (dijelovi.length !== 3) {
    return false;
  }
  const [year, month, day] = dijelovi.map(Number);

  if ( month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  return true;
}

router.get("/api/v1/toilets", async (req, res) => {
  try{
    const result = await pool.query("SELECT * FROM toilets LEFT JOIN reviews USING(toilet_id) ORDER BY review_id ASC");
    if (result.rows.length === 0) {
      return res.status(404).json({ status: "Not found",message: "No toilets found", response: null });
    }
    const jsonLdData = result.rows.map(toilet => ({
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
    return res.status(200).json({ status: "OK",message: "All toilets found", response: jsonLdData });
  }
  catch{
    res.status(500).json({ status: "Service unavailable",message: "Internal server error", response: null });
  }
});

router.post("/api/v1/toilets", async (req, res) => {
  const {toilet_id, name, address, city, postal_code, latitude, longitude, working_hours, unisex, baby_changing_station, toilets_for_disabled, regular_toilets, urinals, disabled_toilets, maintenance, last_date_renovated, free_of_charge, fee_amount} = req.body;
  if(isValidPostalCode(postal_code) === false){
    return res.status(400).json({ status: "Bad request",message: "Postal code length exceeds 5 characters", response: null });
  }
  else if(isValidDateFormat(last_date_renovated) === false){
    return res.status(400).json({ status: "Bad request",message: "Date format is invalid. Please use the format YYYY-MM-DD", response: null });
  }
  try {
    const sql = `INSERT INTO toilets (toilet_id, name, address, city, postal_code, latitude, longitude, working_hours, unisex, baby_changing_station, toilets_for_disabled, regular_toilets, urinals, disabled_toilets, maintenance, last_date_renovated, free_of_charge, fee_amount)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *;`;
    
    const result = await pool.query(sql, [toilet_id, name, address, city, postal_code, latitude, longitude, working_hours, unisex, baby_changing_station, toilets_for_disabled, regular_toilets, urinals, disabled_toilets, maintenance, last_date_renovated, free_of_charge, fee_amount]);
    
    if(!result.rows[0]){
      return res.status(400).json({ status: "Bad request",message: "Toilet could not be registered", response: null });
    }
    
    res.status(201).json({ status: "OK",message: "Successfully registered a new toilet", response: result.rows[0] });
 
  } catch (err){
    res.status(500).json({ status: "Service unavailable",message: "Internal server error", response: err });
  }
});

router.put("/api/v1/toilets", async (req, res) => {
  const {toilet_id, name, address, city, postal_code, latitude, longitude, working_hours, unisex, baby_changing_station, toilets_for_disabled, regular_toilets, urinals, disabled_toilets, maintenance, last_date_renovated, free_of_charge, fee_amount} = req.body;
  if(isValidPostalCode(postal_code) === false){
    return res.status(400).json({ status: "Bad request",message: "Postal code length exceeds 5 characters", response: null });
  }
  else if(isValidDateFormat(last_date_renovated) === false){
    return res.status(400).json({ status: "Bad request",message: "Date format is invalid. Please use the format YYYY-MM-DD", response: null });
  }

  try {
    const sql = `UPDATE toilets SET name=$2, address=$3, city=$4, postal_code=$5, latitude=$6, longitude=$7, working_hours=$8, unisex=$9, baby_changing_station=$10, toilets_for_disabled=$11, regular_toilets=$12, urinals=$13, disabled_toilets=$14, maintenance=$15, last_date_renovated=$16, free_of_charge=$17, fee_amount=$18
                  WHERE toilet_id=$1 RETURNING *;`;
    const result = await pool.query(sql, [toilet_id, name, address, city, postal_code, latitude, longitude, working_hours, unisex, baby_changing_station, toilets_for_disabled, regular_toilets, urinals, disabled_toilets, maintenance, last_date_renovated, free_of_charge, fee_amount]);
    if(!result.rows[0]){
      return res.status(400).json({ status: "Bad request",message: "Toilet could not be updated", response: null });
    }
    
    res.status(201).json({ status: "OK",message: "Successfully updated an existing toilet", response: result.rows[0] });
  } catch (err){
    res.status(500).json({ status: "Service unavailable",message: "Internal server error", response: err });
  }

});

router.get("/api/v1/toilets/:id", async (req, res) => {
  const { id } = req.params;
  try{
    const result = await pool.query("SELECT *  FROM toilets LEFT JOIN reviews USING(toilet_id) \
                                    WHERE toilets.toilet_id = " + id + " ORDER BY review_id ASC");
    if (result.rows.length === 0) {
      return res.status(404).json({ status: "Not found",message: "No toilets found with the given ID have been found", response: null });
    }
    var toilet = result.rows[0];

    const jsonLdData = result.rows.map(toilet => ({
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

    return res.status(200).json({ status: "OK",message: "A list of all public toilets with given ID have been found", response: jsonLdData });
  }
  catch(err){
    res.status(500).json({ status: "Service unavailable",message: "Internal server error", response: null });
  }
});

router.delete("/api/v1/toilets/:id", async (req, res) => {
  const { id } = req.params;
  try{
    const delReviewsResult = await pool.query("DELETE FROM reviews WHERE toilet_id = $1 RETURNING *;", [id]);
    const delToiletResult = await pool.query("DELETE FROM toilets WHERE toilet_id = $1 RETURNING *", [id]); 
    if (delToiletResult.rows.length === 0) {
      return res.status(404).json({ status: "Not found",message: "No toilet found with the given ID to delete", response: null });
    }
    return res.status(200).json({ status: "OK",message: "Toilet and its reviews successfully deleted", response: { deletedToilet: delToiletResult.rows[0], deletedReviews: delReviewsResult.rows } });
  }
  catch(err){
    res.status(500).json({ status: "Service unavailable",message: "Internal server error", response: null });
  }
});

router.get("/api/v1/toilets_by_city/:city_name", async (req, res) => {
  let { city_name } = req.params;
  city_name = city_name.toLowerCase();

  try{
    const result = await pool.query("SELECT *  FROM toilets WHERE LOWER(toilets.city) = '" + city_name + "' ORDER BY toilet_id ASC");
    if (result.rows.length === 0) {
      return res.status(404).json({ status: "Not found",message: "No toilets have been found in the chosen city", response: null });
    }
    const jsonLdData = result.rows.map(toilet => ({
            "@context": {
                "place": "https://schema.org/Place",
                "address": "https://schema.org/PostalAddress",
                "geo": "https://schema.org/GeoCoordinates"
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
            }
        }));

    return res.status(200).json({ status: "OK",message: "A list of all public toilets for the chosen city have been found", response: jsonLdData });
  }
  catch(err){
    res.status(500).json({ status: "Service unavailable",message: "Internal server error", response: null });
  }
});

router.get("/api/v1/toilets_by_postal_code/:postal_code", async (req, res) => {
  let { postal_code } = req.params;

  try{
    const result = await pool.query("SELECT *  FROM toilets WHERE postal_code = '" + postal_code + "' ORDER BY toilet_id ASC");
    if (result.rows.length === 0) {
      return res.status(404).json({ status: "Not found",message: "No public toilets have been found by the given postal code", response: null });
    }
    const jsonLdData = result.rows.map(toilet => ({
            "@context": {
                "place": "https://schema.org/Place",
                "address": "https://schema.org/PostalAddress",
                "geo": "https://schema.org/GeoCoordinates"
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
            }
        }));
    return res.status(200).json({ status: "OK",message: "A list of all public toilets for the chosen postal code have been found", response: jsonLdData });
  }
  catch(err){
    res.status(500).json({ status: "Service unavailable",message: "Internal server error", response: null });
  }
});

router.get("/api/v1/toilets_for_disabled", async (req, res) => {
  try{
    const result = await pool.query("SELECT * FROM toilets WHERE toilets_for_disabled = true ORDER BY toilet_id ASC");
    if (result.rows.length === 0) {
      return res.status(404).json({ status: "Not found",message: "No public toilets for disabled people have been found", response: null });
    }
    const jsonLdData = result.rows.map(toilet => ({
            "@context": {
                "place": "https://schema.org/Place",
                "address": "https://schema.org/PostalAddress",
                "geo": "https://schema.org/GeoCoordinates"
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
            }
        }));
    return res.status(200).json({ status: "OK",message: "All toilets for disabled people found", response: jsonLdData });
  }
  catch{
    res.status(500).json({ status: "Service unavailable",message: "Internal server error", response: null });
  }
});

router.get("/api/v1/toilets_with_baby_station", async (req, res) => {
  try{
    const result = await pool.query("SELECT * FROM toilets WHERE baby_changing_station = true ORDER BY toilet_id ASC");
    if (result.rows.length === 0) {
      return res.status(404).json({ status: "Not found",message: "No public toilets with baby changing stations have been found", response: null });
    }
    const jsonLdData = result.rows.map(toilet => ({
            "@context": {
                "place": "https://schema.org/Place",
                "address": "https://schema.org/PostalAddress",
                "geo": "https://schema.org/GeoCoordinates"
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
            }
        }));
    return res.status(200).json({ status: "OK",message: "All toilets with baby stations found", response: jsonLdData });
  }
  catch{
    res.status(500).json({ status: "Service unavailable",message: "Internal server error", response: null });
  }
});

module.exports = router;
