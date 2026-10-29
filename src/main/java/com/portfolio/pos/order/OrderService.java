package com.portfolio.pos.order;
import com.portfolio.pos.account.*;
import com.portfolio.pos.product.ProductRepository;
import com.portfolio.pos.settings.SettingsService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service @Transactional(readOnly=true)
public class OrderService {
    private final OrderRepository orders;private final ProductRepository products;private final SettingsService settings;
    private final AccountService accounts;private final UserRepository users;
    public OrderService(OrderRepository orders,ProductRepository products,SettingsService settings,AccountService accounts,UserRepository users){this.orders=orders;this.products=products;this.settings=settings;this.accounts=accounts;this.users=users;}
    public List<OrderResponse> list(Authentication auth){var user=accounts.current(auth);return (user.role.equals("Admin")?orders.findTop500ByOrderBySavedAtDesc():orders.findTop500ByCreatedByOrderBySavedAtDesc(user.id)).stream().map(this::response).toList();}
    public OrderResponse get(Long id,Authentication auth){var order=orders.findById(id).orElseThrow(()->error(HttpStatus.NOT_FOUND,"Order not found"));authorize(order,accounts.current(auth));return response(order);}
    @Transactional public OrderResponse create(OrderRequest request,Authentication auth){
        var user=accounts.current(auth);users.lockById(user.id).orElseThrow();
        var signature=signature(request);var existing=orders.findByCreatedByAndCreateRequestId(user.id,request.requestId());
        if(existing.isPresent()){
            if(!existing.get().createSignature.equals(signature))throw error(HttpStatus.CONFLICT,"Request ID has already been used for a different order");
            return response(existing.get());
        }
        var order=new PosOrder();order.number="ORDR#"+UUID.randomUUID();order.createdBy=user.id;order.createRequestId=request.requestId();order.createSignature=signature;
        apply(order,request);return response(orders.saveAndFlush(order));
    }
    @Transactional public OrderResponse update(Long id,OrderRequest request,Authentication auth){
        var user=accounts.current(auth);var order=orders.lockById(id).orElseThrow(()->error(HttpStatus.NOT_FOUND,"Order not found"));authorize(order,user);
        var signature=signature(request);
        if(request.requestId().equals(order.lastRequestId)){
            if(!signature.equals(order.lastSignature))throw error(HttpStatus.CONFLICT,"Request ID has already been used");
            return response(order);
        }
        if(order.status.equals("Paid"))throw error(HttpStatus.CONFLICT,"Paid orders cannot be modified or paid twice");
        if(request.version()==null || request.version()!=order.version)throw error(HttpStatus.CONFLICT,"Order changed in another session. Reload it before saving.");
        order.lastRequestId=request.requestId();order.lastSignature=signature;apply(order,request);return response(orders.saveAndFlush(order));
    }
    private void apply(PosOrder order,OrderRequest request){
        var config=settings.get();var previous=new HashMap<Long,OrderItem>();for(var item:order.items)previous.put(item.productId,item);
        var updated=new ArrayList<OrderItem>();var seen=new HashSet<Long>();BigDecimal subtotal=BigDecimal.ZERO;
        for(var requested:request.items()){
            if(!seen.add(requested.productId()))throw error(HttpStatus.BAD_REQUEST,"A product may only appear once per order");
            OrderItem item;
            if(previous.containsKey(requested.productId()))item=new OrderItem(previous.get(requested.productId()));
            else {
                var product=products.findById(requested.productId()).orElseThrow(()->error(HttpStatus.NOT_FOUND,"Product not found"));
                if(!product.active)throw error(HttpStatus.CONFLICT,"Product is no longer available: "+product.getName());
                item=new OrderItem();item.productId=product.getId();item.name=product.getName();item.category=product.category;item.unit=product.unit;item.price=product.getPrice();item.image=product.image;
            }
            item.quantity=requested.quantity();item.note=requested.note()==null?"":requested.note().trim();updated.add(item);
            subtotal=subtotal.add(item.price.multiply(BigDecimal.valueOf(item.quantity)));
        }
        order.items.clear();order.items.addAll(updated);order.subtotal=subtotal.setScale(2,RoundingMode.HALF_UP);
        order.tax=switch(config.taxMode){case "percent"->subtotal.multiply(config.taxValue).divide(BigDecimal.valueOf(100),2,RoundingMode.HALF_UP);case "none"->BigDecimal.ZERO.setScale(2);default->config.taxValue;};
        order.total=order.subtotal.add(order.tax);if(order.total.compareTo(new BigDecimal("1000000000000"))>0)throw error(HttpStatus.BAD_REQUEST,"Order total exceeds the supported limit");
        if(request.status().equals("Paid")&&request.expectedTotal()!=null&&request.expectedTotal().compareTo(order.total)!=0)throw error(HttpStatus.CONFLICT,"Prices or tax settings changed. Reload the checkout and review the total before paying.");
        order.customer=request.customer()==null?"":request.customer().trim();order.service=request.service();order.table="";
        if(order.service.equals("Dine in")){
            if(request.table()!=null&&!request.table().isBlank()){
                try {int table=Integer.parseInt(request.table());if(table<1||table>config.tables)throw new NumberFormatException();order.table=String.format(Locale.ROOT,"%02d",table);}
                catch(NumberFormatException invalid){throw error(HttpStatus.BAD_REQUEST,"Choose a valid table");}
            }
            if(request.status().equals("Paid")&&order.table.isEmpty())throw error(HttpStatus.BAD_REQUEST,"A table is required for dine-in payments");
        }
        order.status=request.status();order.savedAt=Instant.now();order.cash=null;order.change=null;
        if(order.status.equals("Paid")){
            if(request.cash()==null||request.cash().compareTo(order.total)<0)throw error(HttpStatus.BAD_REQUEST,"Cash received must cover the server-calculated total: "+order.total);
            order.cash=request.cash().setScale(2,RoundingMode.HALF_UP);order.change=order.cash.subtract(order.total);
        }
    }
    private void authorize(PosOrder order,AppUser user){if(!user.role.equals("Admin")&&!order.createdBy.equals(user.id))throw error(HttpStatus.NOT_FOUND,"Order not found");}
    public OrderResponse response(PosOrder order){return new OrderResponse(order.id,order.number,order.customer,order.table,order.service,order.status,order.subtotal,order.tax,order.total,order.cash,order.change,order.savedAt,order.items.stream().mapToInt(item->item.quantity).sum(),List.copyOf(order.items),order.version);}
    private String signature(OrderRequest request){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(request.toString().getBytes(StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException impossible){throw new IllegalStateException(impossible);}}
    private ResponseStatusException error(HttpStatus status,String message){return new ResponseStatusException(status,message);}
}
