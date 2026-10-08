package com.portfolio.pos.product;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.portfolio.pos.product.dto.CreateProductRequest;
import com.portfolio.pos.product.dto.ProductResponse;

import java.math.BigDecimal;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

@WebMvcTest(ProductController.class)
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductService productService;

    @Test
    void shouldRejectBlankProductName() throws Exception {
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "   ",
                                  "price": 8000
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Data produk tidak valid"))
                .andExpect(jsonPath("$.errors[0].field")
                        .value("name"))
                .andExpect(jsonPath("$.errors[0].message")
                        .value("Nama produk wajib diisi"));

        verifyNoInteractions(productService);
    }

    @Test
    void shouldRejectNegativeProductPrice() throws Exception {
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                              "name": "Es Jeruk",
                              "price": -1000
                            }
                            """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Data produk tidak valid"))
                .andExpect(jsonPath("$.errors[0].field")
                        .value("price"))
                .andExpect(jsonPath("$.errors[0].message")
                        .value("Harga tidak boleh negatif"));

        verifyNoInteractions(productService);
    }

    @Test
    void shouldReturnCreatedProductForValidRequest() throws Exception {
        CreateProductRequest request = new CreateProductRequest(
                "Es Jeruk",
                new BigDecimal("8000")
        );

        ProductResponse response = new ProductResponse(
                10L,
                "Es Jeruk",
                new BigDecimal("8000")
        );

        when(productService.createProduct(request))
                .thenReturn(response);

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                              "name": "Es Jeruk",
                              "price": 8000
                            }
                            """))
                .andExpect(status().isCreated())
                .andExpect(header().string(
                        "Location",
                        "/api/products/10"
                ))
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.name").value("Es Jeruk"))
                .andExpect(jsonPath("$.price").value(8000));

        verify(productService).createProduct(request);
    }
}