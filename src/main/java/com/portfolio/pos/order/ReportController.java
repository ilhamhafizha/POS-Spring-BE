package com.portfolio.pos.order;
import com.portfolio.pos.account.AccountService;
import org.springframework.security.core.Authentication;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
@RestController @RequestMapping("/api/reports") @Transactional(readOnly=true)
public class ReportController {
    public record Summary(BigDecimal revenue,long orders,long items,BigDecimal average,BigDecimal tax,long dineIn,long takeAway,long archived){}
    public record Day(LocalDate date,BigDecimal revenue){}
    public record TopProduct(Long productId,String name,long quantity,BigDecimal revenue){}
    public record Report(List<OrderResponse> orders,Summary summary,List<Day> daily,List<TopProduct> products){}
    private final OrderRepository repository;private final OrderService service;private final AccountService accounts;
    public ReportController(OrderRepository repository,OrderService service,AccountService accounts){this.repository=repository;this.service=service;this.accounts=accounts;}
    @GetMapping public Report report(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,@RequestParam(defaultValue="Asia/Jakarta") String zone,Authentication authentication){
        ZoneId timezone;
        try{timezone=ZoneId.of(zone);}catch(DateTimeException invalid){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid timezone");}
        if(from.isAfter(to)||ChronoUnit.DAYS.between(from,to)>365)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a date range of up to one year");
        var user=accounts.current(authentication);
        var start=from.atStartOfDay(timezone).toInstant();var end=to.plusDays(1).atStartOfDay(timezone).toInstant();
        var scopedOrders=user.role.equals("Admin")?repository.findBySavedAtGreaterThanEqualAndSavedAtLessThanOrderBySavedAtDesc(start,end)
            :repository.findByCreatedByAndSavedAtGreaterThanEqualAndSavedAtLessThanOrderBySavedAtDesc(user.id,start,end);
        var orders=scopedOrders.stream().map(service::response).toList();
        var paid=orders.stream().filter(order->order.status().equals("Paid")).toList();
        BigDecimal revenue=paid.stream().map(OrderResponse::subtotal).reduce(BigDecimal.ZERO,BigDecimal::add);
        BigDecimal tax=paid.stream().map(OrderResponse::tax).reduce(BigDecimal.ZERO,BigDecimal::add);
        var summary=new Summary(revenue,paid.size(),paid.stream().mapToLong(OrderResponse::quantity).sum(),paid.isEmpty()?BigDecimal.ZERO:revenue.divide(BigDecimal.valueOf(paid.size()),2,RoundingMode.HALF_UP),tax,
            paid.stream().filter(order->order.service().equals("Dine in")).count(),paid.stream().filter(order->order.service().equals("Take Away")).count(),orders.stream().filter(order->order.status().equals("Archived")).count());
        var daily=new ArrayList<Day>();
        for(LocalDate day=from;!day.isAfter(to);day=day.plusDays(1)){
            LocalDate current=day;daily.add(new Day(day,paid.stream().filter(order->order.savedAt().atZone(timezone).toLocalDate().equals(current)).map(OrderResponse::subtotal).reduce(BigDecimal.ZERO,BigDecimal::add)));
        }
        var top=new HashMap<Long,TopProduct>();
        for(var order:paid)for(var item:order.items()){
            var previous=top.getOrDefault(item.productId,new TopProduct(item.productId,item.name,0,BigDecimal.ZERO));
            top.put(item.productId,new TopProduct(item.productId,previous.name(),previous.quantity()+item.quantity,previous.revenue().add(item.price.multiply(BigDecimal.valueOf(item.quantity)))));
        }
        return new Report(orders,summary,daily,top.values().stream().sorted(Comparator.comparingLong(TopProduct::quantity).reversed().thenComparing(TopProduct::productId)).toList());
    }
}
