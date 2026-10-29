ALTER TABLE products ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'Foods';
ALTER TABLE products ADD COLUMN description VARCHAR(300) NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'portion';
ALTER TABLE products ADD COLUMN image TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE app_users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL DEFAULT '',
    role VARCHAR(20) NOT NULL,
    CONSTRAINT ck_user_role CHECK (role IN ('Admin', 'Cashier'))
);

CREATE TABLE store_settings (
    id BIGINT PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    address VARCHAR(300) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    receipt VARCHAR(200) NOT NULL,
    tax_mode VARCHAR(20) NOT NULL,
    tax_value NUMERIC(19,2) NOT NULL,
    tables INTEGER NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_settings_tax CHECK (tax_value >= 0 AND tax_mode IN ('fixed','percent','none') AND (tax_mode <> 'percent' OR tax_value <= 100)),
    CONSTRAINT ck_settings_tables CHECK (tables BETWEEN 1 AND 50)
);
INSERT INTO store_settings (id,name,address,phone,receipt,tax_mode,tax_value,tables)
VALUES (1,'PadiPos','','','Thank you for your order!','fixed',5000,10);

CREATE TABLE pos_orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    number VARCHAR(80) NOT NULL UNIQUE,
    customer VARCHAR(80) NOT NULL,
    table_number VARCHAR(10) NOT NULL,
    service VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    subtotal NUMERIC(19,2) NOT NULL,
    tax NUMERIC(19,2) NOT NULL,
    total NUMERIC(19,2) NOT NULL,
    cash NUMERIC(19,2),
    change_amount NUMERIC(19,2),
    saved_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by BIGINT NOT NULL REFERENCES app_users(id),
    create_request_id VARCHAR(36) NOT NULL,
    create_signature VARCHAR(64) NOT NULL,
    last_request_id VARCHAR(36),
    last_signature VARCHAR(64),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_order_request UNIQUE (created_by, create_request_id),
    CONSTRAINT ck_order_status CHECK (status IN ('Archived','Paid')),
    CONSTRAINT ck_order_service CHECK (service IN ('Dine in','Take Away')),
    CONSTRAINT ck_order_amounts CHECK (subtotal >= 0 AND tax >= 0 AND total = subtotal + tax),
    CONSTRAINT ck_order_payment CHECK ((status = 'Archived' AND cash IS NULL AND change_amount IS NULL) OR (status = 'Paid' AND cash >= total AND change_amount = cash - total))
);
CREATE INDEX ix_orders_saved_at ON pos_orders(saved_at);
CREATE INDEX ix_orders_owner ON pos_orders(created_by, saved_at);
CREATE TABLE pos_order_items (
    order_id BIGINT NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    product_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(20) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    price NUMERIC(19,2) NOT NULL,
    quantity INTEGER NOT NULL,
    note VARCHAR(200) NOT NULL,
    image TEXT NOT NULL,
    PRIMARY KEY(order_id, position),
    CONSTRAINT ck_order_item CHECK (price >= 0 AND quantity BETWEEN 1 AND 999)
);
