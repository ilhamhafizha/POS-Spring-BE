package com.portfolio.pos.product.dto;
import java.math.BigDecimal;
public record ProductResponse(Long id,String name,BigDecimal price,String category,String description,String unit,String image,boolean active) {
    public ProductResponse(Long id,String name,BigDecimal price){this(id,name,price,"Foods","","portion","",true);}
}
