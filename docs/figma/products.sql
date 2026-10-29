-- Sumber: https://www.figma.com/design/yBIaE4PeVjTi2kZGTvYwbw
-- Komponen Card Menu (42:4553). Jalankan manual setelah migrasi V1.
-- Tidak menimpa produk yang sudah ada dengan nama yang sama.
INSERT INTO products (name, price)
SELECT 'Gado-gado Special', 20000.00
WHERE NOT EXISTS (
    SELECT 1 FROM products WHERE name = 'Gado-gado Special'
);
