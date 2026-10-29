package com.portfolio.pos.order;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/orders")
public class OrderController {
    private final OrderService service;
    public OrderController(OrderService service){this.service=service;}
    @GetMapping List<OrderResponse> list(Authentication auth){return service.list(auth);}
    @GetMapping("/{id}") OrderResponse get(@PathVariable Long id,Authentication auth){return service.get(id,auth);}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) OrderResponse create(@Valid @RequestBody OrderRequest request,Authentication auth){return service.create(request,auth);}
    @PutMapping("/{id}") OrderResponse update(@PathVariable Long id,@Valid @RequestBody OrderRequest request,Authentication auth){return service.update(id,request,auth);}
}
