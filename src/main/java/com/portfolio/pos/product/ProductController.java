package com.portfolio.pos.product;


import java.math.BigDecimal;
import java.util.List;

import com.portfolio.pos.product.dto.ProductResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.bind.annotation.PathVariable;

@RestController
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping("/api/products")
    public List<ProductResponse> getProducts() {
        return productService.getProducts();
    }

    @GetMapping("/api/products/{id}")
    public ProductResponse getProductById(
            @PathVariable("id") Long id
    ) {
        return productService.getProductById(id);
    }
}