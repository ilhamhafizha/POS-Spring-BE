package com.portfolio.pos.product.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateProductRequest(

        @NotBlank(message = "Nama produk wajib diisi")
        @Size(max = 150, message = "Nama produk maksimal 150 karakter")
        String name,

        @NotNull(message = "Harga produk wajib diisi")
        @DecimalMin(value = "0.00", message = "Harga tidak boleh negatif")
        @Digits(
                integer = 17,
                fraction = 2,
                message = "Harga maksimal 17 digit angka dan 2 digit desimal"
        )
        BigDecimal price

) {
}