package com.portfolio.pos.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.net.URI;
import java.util.Map;

@RestController
public class PageController {
    private static final Map<String,String> PAGES=Map.of(
        "/cashier","index.html","/admin","admin.html","/catalog","catalog.html",
        "/reports","reports.html","/settings","settings.html","/profile","profile.html","/login","login.html");

    @GetMapping(value={"/cashier","/admin","/catalog","/reports","/settings","/profile","/login"},produces=MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<Resource> page(HttpServletRequest request){
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).cacheControl(CacheControl.noCache())
            .body(new ClassPathResource("static/"+PAGES.get(request.getRequestURI().substring(request.getContextPath().length()))));
    }

    @GetMapping({"/","/index.html","/admin.html","/catalog.html","/reports.html","/settings.html","/profile.html","/login.html"})
    public ResponseEntity<Void> legacy(HttpServletRequest request){
        String target=request.getRequestURI().substring(request.getContextPath().length()).equals("/")?"/cashier":PAGES.entrySet().stream()
            .filter(entry->("/"+entry.getValue()).equals(request.getRequestURI().substring(request.getContextPath().length()))).findFirst().orElseThrow().getKey();
        String query=request.getQueryString();
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(target+(query==null?"":"?"+query))).build();
    }
}
