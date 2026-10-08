package com.portfolio.pos.common.exception;

public record FieldValidationError(
        String field,
        String message
) {
}