package com.portfolio.pos.product;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
public class Product {

    public Product(String name, BigDecimal price) {
        this.name = name;
        this.price = price;
    }

    public void updateDetails(String name, BigDecimal price) {
        this.name = name;
        this.price = price;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal price;

    @Column(nullable=false,length=20) public String category="Foods";
    @Column(nullable=false,length=300) public String description="";
    @Column(nullable=false,length=20) public String unit="portion";
    @Column(nullable=false,columnDefinition="text") public String image="";
    @Column(nullable=false) public boolean active=true;

    protected Product() {
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getPrice() {
        return price;
    }


}