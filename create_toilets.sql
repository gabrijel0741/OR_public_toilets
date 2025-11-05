CREATE TABLE IF NOT EXISTS toilets (
    toilet_id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    address VARCHAR(80),
    city VARCHAR(50),
    postal_code CHAR(5),
    latitude NUMERIC(6,4),
    longitude NUMERIC(6,4),
    working_hours VARCHAR(20),
    unisex BOOLEAN,
    baby_changing_station BOOLEAN,
    toilets_for_disabled BOOLEAN,
    regular_toilets INT,
    urinals INT,
    disabled_toilets INT,
    maintenance VARCHAR(50),
    last_date_renovated DATE,
    free_of_charge BOOLEAN,
    fee_amount NUMERIC(4,2)
);

CREATE TABLE IF NOT EXISTS reviews(
    review_id SERIAL PRIMARY KEY,
    review_user VARCHAR(50),
    review_user_rating INT,
    review_comment VARCHAR(255),
    FOREIGN KEY (toilet_id) REFERENCES toilets(toilet_id) ON DELETE CASCADE
)

COPY toilets (
  toilet_id, name, address, city, postal_code, latitude, longitude, working_hours, unisex, baby_changing_station,
  toilets_for_disabled, regular_toilets, urinals, disabled_toilets, maintenance, last_date_renovated, 
  free_of_charge, fee_amount
)
FROM 'insert/path/to/csv_table_of_public_toilets_downloaded.csv'
WITH (FORMAT csv, HEADER true, QUOTE '"', ESCAPE '"');

COPY toilets (
  toilet_id, review_user, review_user_rating, review_comment
)
FROM 'insert/path/to/csv_table_of_public_toilets_reviews_downloaded.csv'
WITH (FORMAT csv, HEADER true, QUOTE '"', ESCAPE '"');