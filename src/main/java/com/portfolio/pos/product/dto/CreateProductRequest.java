package com.portfolio.pos.product.dto;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
public record CreateProductRequest(
    @NotBlank(message="Nama produk wajib diisi") @Size(max=150,message="Nama produk maksimal 150 karakter") String name,
    @NotNull(message="Harga produk wajib diisi") @DecimalMin(value="0.00",message="Harga tidak boleh negatif")
    @DecimalMax("1000000000000") @Digits(integer=13,fraction=2,message="Harga maksimal 13 digit angka dan 2 digit desimal") BigDecimal price,
    @Pattern(regexp="Foods|Beverages|Dessert") String category,
    @Size(max=300) String description,
    @Pattern(regexp="portion|cup|piece") String unit,
    @Size(max=1500000) String image,
    Boolean active
) {
    public CreateProductRequest(String name,BigDecimal price){this(name,price,null,null,null,null,null);}
}
