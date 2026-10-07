package com.portfolio.pos.product;

import com.portfolio.pos.product.dto.ProductResponse;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductService {

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

    public ProductResponse getProductById(Long id) {
        for (ProductResponse product : getProducts()) {
            if (product.id().equals(id)) {
                return product;
            }
        }

        throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Produk tidak ditemukan"
        );
    }
}