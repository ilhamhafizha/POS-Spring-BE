package com.portfolio.pos.product;


import java.math.BigDecimal;

import com.portfolio.pos.product.dto.ProductResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProductController {

    @GetMapping("/api/products/example")
    public ProductResponse getExampleProduct() {
        return new ProductResponse(
                1L,
                "Nasi Goreng",
                new BigDecimal("25000")
        );
    }
}