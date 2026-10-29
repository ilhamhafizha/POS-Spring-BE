package com.portfolio.pos.account;
import jakarta.validation.Validator;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import com.portfolio.pos.product.Product;
import com.portfolio.pos.product.ProductRepository;
import java.math.BigDecimal;
@Component
public class BootstrapUsers implements ApplicationRunner {
    private final AccountService accounts;private final UserRepository users;private final Validator validator;
    @Value("${pos.bootstrap.admin-email:}") private String adminEmail;
    @Value("${pos.bootstrap.admin-password:}") private String adminPassword;
    @Value("${pos.bootstrap.cashier-email:}") private String cashierEmail;
    @Value("${pos.bootstrap.cashier-password:}") private String cashierPassword;
    @Value("${pos.seed-reference-product:false}") private boolean seedProduct;
    private final ProductRepository products;
    public BootstrapUsers(AccountService accounts,UserRepository users,Validator validator,ProductRepository products){this.accounts=accounts;this.users=users;this.validator=validator;this.products=products;}
    public void run(ApplicationArguments args){
        seed(adminEmail,adminPassword,"Administrator","Admin");seed(cashierEmail,cashierPassword,"Cashier","Cashier");
        if(users.count()==0)LoggerFactory.getLogger(getClass()).warn("No accounts exist. Set ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap an administrator.");
        if(seedProduct && products.count()==0){
            var product=new Product("Gado-gado Special",new BigDecimal("20000"));
            product.description="Vegetables, egg, tempe, tofu, ketupat, peanut sauce, and kerupuk.";product.image="assets/42-4552-imgImage5.png";products.save(product);
        }
    }
    private void seed(String email,String password,String name,String role){
        if(email.isBlank()&&password.isBlank())return;
        if(users.existsByEmail(email.trim().toLowerCase(java.util.Locale.ROOT)))return;
        var request=new AccountService.CreateUser(name,email,password,role);
        if(!validator.validate(request).isEmpty())throw new IllegalStateException("Invalid bootstrap credentials: use a valid email and a password of 10–72 characters");
        accounts.create(request);
    }
}
