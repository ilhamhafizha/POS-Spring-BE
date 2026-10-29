package com.portfolio.pos.settings;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/settings")
public class SettingsController {
    private final SettingsService service;
    public SettingsController(SettingsService service){this.service=service;}
    @GetMapping StoreSettings get(){return service.get();}
    @PutMapping StoreSettings update(@Valid @RequestBody SettingsService.Request request){return service.update(request);}
}
