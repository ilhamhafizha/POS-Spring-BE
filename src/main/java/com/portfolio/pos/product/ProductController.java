package com.portfolio.pos.product;


import java.math.BigDecimal;
import java.util.List;

import com.portfolio.pos.product.dto.ProductResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProductController {

    @GetMapping("/api/products")
    public List<ProductResponse> getProducts() {
        return List.of(
                new ProductResponse(
                        1L,
                        "Nasi Goreng",
                        new BigDecimal("25000")
                ),
                new ProductResponse(
                        2L,
                        "Es Teh",
                        new BigDecimal("5000")
                )
        );
    }
}