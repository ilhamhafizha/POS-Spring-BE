package com.portfolio.pos.hello;

import com.portfolio.pos.hello.dto.HelloResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/api/hello")
    public HelloResponse hello(
            @RequestParam(name = "name", defaultValue = "Teman") String name
    ) {
        return new HelloResponse(
                "Halo, " + name + "! Backend POS berhasil berjalan!",
                "pos-backend"
        );
    }
}