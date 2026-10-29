package com.portfolio.pos.order;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
public record OrderRequest(
    @NotBlank @Pattern(regexp="[0-9a-fA-F-]{36}") String requestId,
    @Size(max=80) String customer,@Size(max=10) String table,
    @NotNull @Pattern(regexp="Dine in|Take Away") String service,
    @NotNull @Pattern(regexp="Paid|Archived") String status,
    @NotNull @Size(min=1,max=200) List<@NotNull @Valid Item> items,
    @DecimalMin("0") @DecimalMax("1000000000000") @Digits(integer=13,fraction=2) BigDecimal cash,
    @DecimalMin("0") @Digits(integer=13,fraction=2) BigDecimal expectedTotal,
    @Min(0) Long version
){
    public record Item(@NotNull @Positive Long productId,@Min(1) @Max(999) int quantity,@Size(max=200) String note){}
}
