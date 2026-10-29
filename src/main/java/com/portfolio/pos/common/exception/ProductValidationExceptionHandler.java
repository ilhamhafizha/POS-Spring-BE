package com.portfolio.pos.common.exception;
import com.portfolio.pos.product.ProductController;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;
@RestControllerAdvice
public class ProductValidationExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> validation(MethodArgumentNotValidException exception){
        List<FieldValidationError> errors=exception.getBindingResult().getFieldErrors().stream().map(error->new FieldValidationError(error.getField(),error.getDefaultMessage())).toList();
        return ResponseEntity.badRequest().body(new ValidationErrorResponse(exception.getParameter().getContainingClass()==ProductController.class?"Data produk tidak valid":"Data tidak valid",errors));
    }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String,String>> status(ResponseStatusException exception){return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message",exception.getReason()==null?"Request failed":exception.getReason()));}
    @ExceptionHandler({DataIntegrityViolationException.class,ObjectOptimisticLockingFailureException.class})
    public ResponseEntity<Map<String,String>> conflict(Exception exception){return ResponseEntity.status(409).body(Map.of("message","Data changed or conflicts with an existing record. Reload and try again."));}
    @ExceptionHandler({HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Map<String,String>> malformed(Exception exception){return ResponseEntity.badRequest().body(Map.of("message","Invalid request data"));}
}
