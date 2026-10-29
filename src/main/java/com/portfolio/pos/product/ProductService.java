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
                product.getPrice(), product.category, product.description, product.unit, product.image, product.active
        );
    }

    @Transactional
    public ProductResponse createProduct(CreateProductRequest request) {
        Product product = new Product(
                request.name().strip(),
                request.price()
        );

        metadata(product,request.category(),request.description(),request.unit(),request.image(),request.active());
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

        metadata(product,request.category(),request.description(),request.unit(),request.image(),request.active());
        return toResponse(product);
    }
    @Transactional public void deleteProduct(Long id){
        var product=productRepository.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Produk tidak ditemukan"));
        productRepository.delete(product);
    }
    private void metadata(Product product,String category,String description,String unit,String image,Boolean active){
        if(category!=null)product.category=category;
        if(description!=null)product.description=description.trim();
        if(unit!=null)product.unit=unit;
        if(active!=null)product.active=active;
        if(image!=null){validateImage(image);product.image=image;}
    }
    private void validateImage(String image){
        if(image.isEmpty() || image.equals("assets/42-4552-imgImage5.png"))return;
        if(!image.matches("data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Use a PNG, JPEG or WebP image");
        try {
            byte[] bytes=java.util.Base64.getDecoder().decode(image.substring(image.indexOf(',')+1));
            boolean png=bytes.length>8 && bytes[0]==(byte)0x89 && bytes[1]=='P' && bytes[2]=='N' && bytes[3]=='G';
            boolean jpeg=bytes.length>3 && bytes[0]==(byte)0xff && bytes[1]==(byte)0xd8 && bytes[2]==(byte)0xff;
            boolean webp=bytes.length>12 && new String(bytes,0,4,java.nio.charset.StandardCharsets.US_ASCII).equals("RIFF") && new String(bytes,8,4,java.nio.charset.StandardCharsets.US_ASCII).equals("WEBP");
            if(bytes.length>1024*1024 || !(image.startsWith("data:image/png;")&&png || image.startsWith("data:image/jpeg;")&&jpeg || image.startsWith("data:image/webp;")&&webp))throw new IllegalArgumentException();
        }catch(IllegalArgumentException invalid){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid image or image larger than 1 MB");}
    }
}