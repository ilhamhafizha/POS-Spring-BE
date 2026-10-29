package com.portfolio.pos.security;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
public record PosPrincipal(Long id,String email,String hash,String role) implements UserDetails {
    @Override public String toString(){return "PosPrincipal[id="+id+", role="+role+"]";}
    public String getUsername(){return email;}
    public String getPassword(){return hash;}
    public Collection<? extends GrantedAuthority> getAuthorities(){return List.of(new SimpleGrantedAuthority("ROLE_"+role.toUpperCase(Locale.ROOT)));}
}
