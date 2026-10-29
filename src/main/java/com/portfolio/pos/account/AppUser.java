package com.portfolio.pos.account;

import jakarta.persistence.*;

@Entity
@Table(name="app_users")
public class AppUser {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @Column(nullable=false,length=80) public String name;
    @Column(nullable=false,unique=true,length=150) public String email;
    @Column(name="password_hash",nullable=false,length=100) public String passwordHash;
    @Column(nullable=false,length=30) public String phone="";
    @Column(nullable=false,length=20) public String role;
}
