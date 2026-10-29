package com.portfolio.pos.settings;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
@Service @Transactional(readOnly=true)
public class SettingsService {
    public record Request(@NotBlank @Size(max=80) String name,@Size(max=300) String address,@Size(max=30) String phone,
        @Size(max=200) String receipt,@NotNull @Pattern(regexp="fixed|percent|none") String taxMode,
        @NotNull @DecimalMin("0") @DecimalMax("1000000000000") @Digits(integer=13,fraction=2) BigDecimal taxValue,
        @Min(1) @Max(50) int tables,@NotNull Long version){}
    private final SettingsRepository repository;
    public SettingsService(SettingsRepository repository){this.repository=repository;}
    public StoreSettings get(){return repository.findById(1L).orElseThrow();}
    @Transactional public StoreSettings update(Request request){
        var value=get();
        if(value.version!=request.version())throw new ResponseStatusException(HttpStatus.CONFLICT,"Settings changed in another session. Reload before saving.");
        if(request.taxMode().equals("percent")&&request.taxValue().compareTo(BigDecimal.valueOf(100))>0)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Tax percentage must be between 0 and 100");
        value.name=request.name().trim();value.address=request.address()==null?"":request.address().trim();value.phone=request.phone()==null?"":request.phone().trim();
        value.receipt=request.receipt()==null?"":request.receipt().trim();value.taxMode=request.taxMode();value.taxValue=request.taxMode().equals("none")?BigDecimal.ZERO:request.taxValue();value.tables=request.tables();
        return repository.saveAndFlush(value);
    }
}
