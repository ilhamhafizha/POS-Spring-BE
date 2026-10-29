CREATE TABLE products (
                          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                          name VARCHAR(150) NOT NULL,
                          price NUMERIC(19, 2) NOT NULL,
                          CONSTRAINT ck_products_price_non_negative CHECK (price >= 0)
);