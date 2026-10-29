package com.portfolio.pos.order;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
public interface OrderRepository extends JpaRepository<PosOrder,Long> {
    Optional<PosOrder> findByCreatedByAndCreateRequestId(Long createdBy,String requestId);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select o from PosOrder o where o.id=:id") Optional<PosOrder> lockById(Long id);
    List<PosOrder> findTop500ByOrderBySavedAtDesc();
    List<PosOrder> findTop500ByCreatedByOrderBySavedAtDesc(Long createdBy);
    List<PosOrder> findByCreatedByAndSavedAtGreaterThanEqualAndSavedAtLessThanOrderBySavedAtDesc(Long createdBy,Instant from,Instant to);
    List<PosOrder> findBySavedAtGreaterThanEqualAndSavedAtLessThanOrderBySavedAtDesc(Instant from,Instant to);
}
