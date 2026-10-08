package com.portfolio.pos.common.exception;

import java.util.List;

public record ValidationErrorResponse(
        String message,
        List<FieldValidationError> errors
) {
}