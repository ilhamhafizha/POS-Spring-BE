package com.portfolio.pos.security;

import com.portfolio.pos.account.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import java.util.Locale;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
    @Bean UserDetailsService userDetailsService(UserRepository users){
        return email -> {
            var user=users.findByEmail(email.trim().toLowerCase(Locale.ROOT)).orElseThrow(()->new UsernameNotFoundException("Invalid credentials"));
            return new PosPrincipal(user.id,user.email,user.passwordHash,user.role);
        };
    }
    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(auth->auth
                .requestMatchers("/api/auth/csrf","/api/auth/login","/error").permitAll()
                .requestMatchers(HttpMethod.GET,"/api/reports").authenticated()
                .requestMatchers("/api/reports","/api/reports/**","/api/users","/api/users/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST,"/api/products").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT,"/api/products/**","/api/settings").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE,"/api/products/**").hasRole("ADMIN")
                .requestMatchers("/api/**").authenticated().anyRequest().permitAll())
            .formLogin(form->form.loginProcessingUrl("/api/auth/login").usernameParameter("email")
                .successHandler((request,response,authentication)->response.setStatus(204))
                .failureHandler((request,response,exception)->{response.setStatus(401);response.setContentType("application/json");response.getWriter().write("{\"message\":\"Email or password is incorrect\"}");}))
            .logout(logout->logout.logoutUrl("/api/auth/logout").invalidateHttpSession(true).deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request,response,authentication)->response.setStatus(204)))
            .exceptionHandling(errors->errors
                .authenticationEntryPoint((request,response,exception)->{response.setStatus(401);response.setContentType("application/json");response.getWriter().write("{\"message\":\"Please sign in\"}");})
                .accessDeniedHandler((request,response,exception)->{response.setStatus(403);response.setContentType("application/json");response.getWriter().write("{\"message\":\"Access denied or CSRF token expired\"}");}))
            .build();
    }
}
