package com.portfolio.pos.account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface UserRepository extends JpaRepository<AppUser,Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select u from AppUser u where u.id=:id") Optional<AppUser> lockById(Long id);
    Optional<AppUser> findByEmail(String email);
    boolean existsByEmail(String email);
}
