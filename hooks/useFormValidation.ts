"use client";

import { useState, useCallback, useRef } from "react";
import { z } from "zod";
import { useErrorHandler } from "./useErrorHandler";
import { formatValidationErrors } from "@/lib/staff-form-validation";

export interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void> | void;
  onSuccess?: (data: T) => void;
  onError?: (errors: Record<string, string>) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  resetOnSuccess?: boolean;
}

export interface UseFormValidationReturn<T> {
  values: Partial<T>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
  hasErrors: boolean;
  setValue: (field: keyof T, value: any) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, error: string) => void;
  clearError: (field: keyof T) => void;
  clearErrors: () => void;
  validateField: (field: keyof T) => boolean;
  validateForm: () => boolean;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: (values?: Partial<T>) => void;
  getFieldProps: (field: keyof T) => {
    value: any;
    onChange: (value: any) => void;
    onBlur: () => void;
    error?: string;
    hasError: boolean;
  };
}

export function useFormValidation<T extends Record<string, any>>({
  schema,
  onSubmit,
  onSuccess,
  onError,
  validateOnChange = false,
  validateOnBlur = true,
  resetOnSuccess = false,
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> {
  const [values, setValuesState] = useState<Partial<T>>({});
  const [errors, setErrorsState] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<keyof T>>(new Set());
  
  const { handleError: handleGlobalError } = useErrorHandler();
  const submitAttempted = useRef(false);

  const isValid = Object.keys(errors).length === 0;
  const hasErrors = Object.keys(errors).length > 0;

  const validateField = useCallback((field: keyof T): boolean => {
    try {
      const fieldSchema = schema.pick({ [field]: true } as any);
      fieldSchema.parse({ [field]: values[field] });
      
      // Clear error if validation passes
      setErrorsState(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = formatValidationErrors(error);
        const fieldError = fieldErrors[field as string];
        
        if (fieldError) {
          setErrorsState(prev => ({
            ...prev,
            [field as string]: fieldError,
          }));
        }
      }
      return false;
    }
  }, [schema, values]);

  const validateForm = useCallback((): boolean => {
    try {
      schema.parse(values);
      setErrorsState({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = formatValidationErrors(error);
        setErrorsState(formattedErrors);
        onError?.(formattedErrors);
      }
      return false;
    }
  }, [schema, values, onError]);

  const setValue = useCallback((field: keyof T, value: any) => {
    setValuesState(prev => ({
      ...prev,
      [field]: value,
    }));

    // Validate on change if enabled or if submit was attempted
    if (validateOnChange || submitAttempted.current) {
      setTimeout(() => validateField(field), 0);
    }
  }, [validateField, validateOnChange]);

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({
      ...prev,
      ...newValues,
    }));

    // Validate changed fields if needed
    if (validateOnChange || submitAttempted.current) {
      setTimeout(() => {
        Object.keys(newValues).forEach(field => {
          validateField(field as keyof T);
        });
      }, 0);
    }
  }, [validateField, validateOnChange]);

  const setError = useCallback((field: keyof T, error: string) => {
    setErrorsState(prev => ({
      ...prev,
      [field as string]: error,
    }));
  }, []);

  const clearError = useCallback((field: keyof T) => {
    setErrorsState(prev => {
      const newErrors = { ...prev };
      delete newErrors[field as string];
      return newErrors;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrorsState({});
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (isSubmitting) return;
    
    submitAttempted.current = true;
    setIsSubmitting(true);

    try {
      // Validate the form
      if (!validateForm()) {
        return;
      }

      // Parse and submit the data
      const validatedData = schema.parse(values);
      await onSubmit(validatedData);
      
      onSuccess?.(validatedData);
      
      if (resetOnSuccess) {
        reset();
      }
    } catch (error) {
      console.error("Form submission error:", error);
      
      if (error instanceof z.ZodError) {
        const formattedErrors = formatValidationErrors(error);
        setErrorsState(formattedErrors);
        onError?.(formattedErrors);
      } else {
        handleGlobalError(error as Error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    validateForm,
    schema,
    values,
    onSubmit,
    onSuccess,
    resetOnSuccess,
    onError,
    handleGlobalError,
  ]);

  const reset = useCallback((initialValues?: Partial<T>) => {
    setValuesState(initialValues || {});
    setErrorsState({});
    setTouchedFields(new Set());
    submitAttempted.current = false;
  }, []);

  const getFieldProps = useCallback((field: keyof T) => {
    const fieldError = errors[field as string];
    
    return {
      value: values[field] ?? "",
      onChange: (value: any) => setValue(field, value),
      onBlur: () => {
        setTouchedFields(prev => new Set(prev).add(field));
        if (validateOnBlur || submitAttempted.current) {
          validateField(field);
        }
      },
      error: fieldError,
      hasError: !!fieldError,
    };
  }, [values, errors, setValue, validateField, validateOnBlur]);

  return {
    values,
    errors,
    isSubmitting,
    isValid,
    hasErrors,
    setValue,
    setValues,
    setError,
    clearError,
    clearErrors,
    validateField,
    validateForm,
    handleSubmit,
    reset,
    getFieldProps,
  };
}

// Specialized hook for file upload validation
export interface UseFileUploadValidationOptions {
  maxSize?: number; // in MB
  allowedTypes?: string[];
  required?: boolean;
  onFileSelect?: (file: File) => void;
  onError?: (error: string) => void;
}

export function useFileUploadValidation({
  maxSize = 10,
  allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ],
  required = false,
  onFileSelect,
  onError,
}: UseFileUploadValidationOptions = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return "File type not supported. Please upload PDF, Word, or image files.";
    }

    return null;
  }, [maxSize, allowedTypes]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return false;
    }

    setFile(selectedFile);
    setError(null);
    onFileSelect?.(selectedFile);
    return true;
  }, [validateFile, onFileSelect, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const removeFile = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  const validate = useCallback((): boolean => {
    if (required && !file) {
      const errorMessage = "Please select a file";
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    }

    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        onError?.(validationError);
        return false;
      }
    }

    setError(null);
    return true;
  }, [file, required, validateFile, onError]);

  return {
    file,
    error,
    isDragging,
    hasError: !!error,
    isValid: !error && (!required || !!file),
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleInputChange,
    removeFile,
    validate,
    formatFileSize: (bytes: number) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    },
  };
}