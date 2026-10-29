package com.portfolio.pos.order;
import jakarta.persistence.*;
import java.math.BigDecimal;
@Embeddable
public class OrderItem {
    @Column(name="product_id",nullable=false) public Long productId;
    @Column(nullable=false,length=150) public String name;
    @Column(nullable=false,length=20) public String category;
    @Column(nullable=false,length=20) public String unit;
    @Column(nullable=false,precision=19,scale=2) public BigDecimal price;
    @Column(nullable=false) public int quantity;
    @Column(nullable=false,length=200) public String note;
    @Column(nullable=false,columnDefinition="text") public String image;
    public OrderItem(){}
    public OrderItem(OrderItem source){productId=source.productId;name=source.name;category=source.category;unit=source.unit;price=source.price;quantity=source.quantity;note=source.note;image=source.image;}
}
