package com.portfolio.pos.order;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
public record OrderResponse(Long id,String number,String customer,String table,String service,String status,
    BigDecimal subtotal,BigDecimal tax,BigDecimal total,BigDecimal cash,BigDecimal change,Instant savedAt,
    int quantity,List<OrderItem> items,long version){}
