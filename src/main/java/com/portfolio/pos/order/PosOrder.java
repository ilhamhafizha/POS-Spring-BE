package com.portfolio.pos.order;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
@Entity @Table(name="pos_orders")
public class PosOrder {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @Column(nullable=false,unique=true,length=80) public String number;
    @Column(nullable=false,length=80) public String customer;
    @Column(name="table_number",nullable=false,length=10) public String table;
    @Column(nullable=false,length=20) public String service;
    @Column(nullable=false,length=20) public String status;
    @Column(nullable=false,precision=19,scale=2) public BigDecimal subtotal;
    @Column(nullable=false,precision=19,scale=2) public BigDecimal tax;
    @Column(nullable=false,precision=19,scale=2) public BigDecimal total;
    @Column(precision=19,scale=2) public BigDecimal cash;
    @Column(name="change_amount",precision=19,scale=2) public BigDecimal change;
    @Column(name="saved_at",nullable=false) public Instant savedAt;
    @Column(name="created_by",nullable=false) public Long createdBy;
    @Column(name="create_request_id",nullable=false,length=36) public String createRequestId;
    @Column(name="create_signature",nullable=false,length=64) public String createSignature;
    @Column(name="last_request_id",length=36) public String lastRequestId;
    @Column(name="last_signature",length=64) public String lastSignature;
    @Version public long version;
    @ElementCollection @CollectionTable(name="pos_order_items",joinColumns=@JoinColumn(name="order_id")) @OrderColumn(name="position")
    public List<OrderItem> items=new ArrayList<>();
}
