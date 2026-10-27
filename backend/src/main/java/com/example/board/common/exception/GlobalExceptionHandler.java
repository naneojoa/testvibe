package com.example.board.common.exception;

import com.example.board.common.api.ErrorResponse;
import com.example.board.common.web.RequestIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  ResponseEntity<ErrorResponse> api(ApiException e, HttpServletRequest request) {
    log.info(
        "API request rejected: method={}, path={}, code={}, status={}",
        request.getMethod(),
        request.getRequestURI(),
        e.code(),
        e.status().value());
    return response(request, e.status(), e.code(), e.getMessage(), Map.of());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ErrorResponse> invalid(
      MethodArgumentNotValidException e, HttpServletRequest request) {
    Map<String, String> fields = new LinkedHashMap<>();
    for (FieldError error : e.getBindingResult().getFieldErrors())
      fields.put(error.getField(), error.getDefaultMessage());
    return response(
        request, HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Request validation failed", fields);
  }

  @ExceptionHandler(ConstraintViolationException.class)
  ResponseEntity<ErrorResponse> constraint(
      ConstraintViolationException e, HttpServletRequest request) {
    Map<String, String> fields = new LinkedHashMap<>();
    e.getConstraintViolations()
        .forEach(
            violation ->
                fields.put(
                    lastPathSegment(violation.getPropertyPath().toString()),
                    violation.getMessage()));
    return response(
        request, HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Request validation failed", fields);
  }

  @ExceptionHandler({
    MethodArgumentTypeMismatchException.class,
    HttpMessageNotReadableException.class
  })
  ResponseEntity<ErrorResponse> malformed(Exception e, HttpServletRequest request) {
    return response(
        request, HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Request format is invalid", Map.of());
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ErrorResponse> conflict(
      DataIntegrityViolationException e, HttpServletRequest request) {
    log.warn(
        "Database constraint rejected request: method={}, path={}",
        request.getMethod(),
        request.getRequestURI());
    return response(
        request,
        HttpStatus.CONFLICT,
        "DATA_CONFLICT",
        "The requested change conflicts with the current state",
        Map.of());
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ErrorResponse> denied(AccessDeniedException e, HttpServletRequest request) {
    return response(request, HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied", Map.of());
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ErrorResponse> unexpected(Exception e, HttpServletRequest request) {
    log.error(
        "Unexpected request failure: method={}, path={}, requestId={}",
        request.getMethod(),
        request.getRequestURI(),
        RequestIdFilter.requestId(request),
        e);
    return response(
        request,
        HttpStatus.INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
        "Unexpected server error",
        Map.of());
  }

  private ResponseEntity<ErrorResponse> response(
      HttpServletRequest request,
      HttpStatus status,
      String code,
      String message,
      Map<String, String> fields) {
    return ResponseEntity.status(status).body(ErrorResponse.of(request, code, message, fields));
  }

  private String lastPathSegment(String path) {
    int separator = path.lastIndexOf('.');
    return separator < 0 ? path : path.substring(separator + 1);
  }
}
