package com.portfolio.pos.settings;
import jakarta.persistence.*;
import java.math.BigDecimal;
@Entity @Table(name="store_settings")
public class StoreSettings {
    @Id public Long id=1L;
    @Column(nullable=false,length=80) public String name;
    @Column(nullable=false,length=300) public String address;
    @Column(nullable=false,length=30) public String phone;
    @Column(nullable=false,length=200) public String receipt;
    @Column(name="tax_mode",nullable=false,length=20) public String taxMode;
    @Column(name="tax_value",nullable=false,precision=19,scale=2) public BigDecimal taxValue;
    @Column(nullable=false) public int tables;
    @Version public long version;
}
