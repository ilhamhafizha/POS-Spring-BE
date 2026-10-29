package com.portfolio.pos.account;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
public class AccountController {
    private final AccountService accounts;private final UserRepository users;
    public AccountController(AccountService accounts,UserRepository users){this.accounts=accounts;this.users=users;}
    public record Token(String token,String headerName){}
    @GetMapping("/api/auth/csrf") Token csrf(CsrfToken token){return new Token(token.getToken(),token.getHeaderName());}
    @GetMapping({"/api/auth/me","/api/profile"}) AccountService.Profile me(Authentication auth){return accounts.profile(accounts.current(auth));}
    @PutMapping("/api/profile") AccountService.Profile update(Authentication auth,@Valid @RequestBody AccountService.ProfileRequest request){return accounts.update(auth,request);}
    @PostMapping("/api/users") @ResponseStatus(HttpStatus.CREATED) AccountService.Profile create(@Valid @RequestBody AccountService.CreateUser request){return accounts.create(request);}
    @GetMapping("/api/users") List<AccountService.Profile> list(){return users.findAll().stream().map(accounts::profile).toList();}
}
