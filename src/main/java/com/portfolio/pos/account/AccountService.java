package com.portfolio.pos.account;
import com.portfolio.pos.security.PosPrincipal;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
@Transactional(readOnly=true)
public class AccountService {
    public record Profile(Long id,String name,String email,String phone,String role){}
    public record ProfileRequest(@NotBlank @Size(max=80) String name,@NotBlank @Email @Size(max=150) String email,@Size(max=30) String phone){}
    public record CreateUser(@NotBlank @Size(max=80) String name,@NotBlank @Email @Size(max=150) String email,
        @NotBlank @Size(min=10,max=72) String password,@Pattern(regexp="Admin|Cashier") @NotNull String role){}
    private final UserRepository users;
    private final PasswordEncoder passwords;
    public AccountService(UserRepository users,PasswordEncoder passwords){this.users=users;this.passwords=passwords;}
    public AppUser current(Authentication auth){
        if(auth==null || !(auth.getPrincipal() instanceof PosPrincipal principal))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Please sign in");
        return users.findById(principal.id()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Please sign in"));
    }
    public Profile profile(AppUser user){return new Profile(user.id,user.name,user.email,user.phone,user.role);}
    @Transactional public Profile update(Authentication auth,ProfileRequest request){
        var user=current(auth);var email=request.email().trim().toLowerCase(Locale.ROOT);
        if(users.findByEmail(email).filter(other->!other.id.equals(user.id)).isPresent())throw new ResponseStatusException(HttpStatus.CONFLICT,"Email is already in use");
        user.name=request.name().trim();user.email=email;user.phone=request.phone()==null?"":request.phone().trim();return profile(user);
    }
    @Transactional public Profile create(CreateUser request){
        var email=request.email().trim().toLowerCase(Locale.ROOT);
        if(users.existsByEmail(email))throw new ResponseStatusException(HttpStatus.CONFLICT,"Email is already in use");
        if(request.password().getBytes(StandardCharsets.UTF_8).length>72)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Password must be at most 72 UTF-8 bytes");
        var user=new AppUser();user.name=request.name().trim();user.email=email;user.role=request.role();user.passwordHash=passwords.encode(request.password());return profile(users.save(user));
    }
}
