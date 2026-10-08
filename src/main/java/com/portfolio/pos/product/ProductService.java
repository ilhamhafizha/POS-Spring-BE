package com.portfolio.pos.product;

import com.portfolio.pos.product.dto.ProductResponse;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import com.portfolio.pos.product.dto.CreateProductRequest;
import com.portfolio.pos.product.dto.UpdateProductRequest;

@Service
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;


    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<ProductResponse> getProducts() {
        return productRepository.findAll(Sort.by("id"))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Produk tidak ditemukan"
                ));

        return toResponse(product);
    }

    private ProductResponse toResponse(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getPrice()
        );
    }

    @Transactional
    public ProductResponse createProduct(CreateProductRequest request) {
        Product product = new Product(
                request.name().strip(),
                request.price()
        );

        Product savedProduct = productRepository.save(product);

        return toResponse(savedProduct);
    }

    @Transactional
    public ProductResponse updateProduct(
            Long id,
            UpdateProductRequest request
    ) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Produk tidak ditemukan"
                ));

        product.updateDetails(
                request.name().strip(),
                request.price()
        );

        return toResponse(product);
    }
}