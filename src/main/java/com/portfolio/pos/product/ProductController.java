package com.portfolio.pos.product;


import java.math.BigDecimal;
import java.util.List;

import com.portfolio.pos.product.dto.ProductResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.bind.annotation.PathVariable;

import com.portfolio.pos.product.dto.CreateProductRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.net.URI;

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

    @PostMapping("/api/products")
    public ResponseEntity<ProductResponse> createProduct(
            @Valid @RequestBody CreateProductRequest request
    ) {
        ProductResponse response = productService.createProduct(request);

        URI location = URI.create("/api/products/" + response.id());

        return ResponseEntity.created(location).body(response);
    }
}