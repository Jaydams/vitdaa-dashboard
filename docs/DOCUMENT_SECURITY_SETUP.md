# Document Management Security Setup Guide

## Overview

The Document Management System is designed to work with **private** Supabase Storage buckets to ensure sensitive staff documents are properly secured. This guide explains how to configure your Supabase bucket and the security measures implemented.

## 🔒 Supabase Bucket Configuration

### 1. Create Private Bucket

In your Supabase Dashboard:

1. Go to **Storage** → **Buckets**
2. Click **New Bucket**
3. Set the following:
   - **Name**: `staff-documents`
   - **Public**: **❌ DISABLED** (This is crucial!)
   - **File size limit**: 10MB (optional)
   - **Allowed MIME types**: `application/pdf,image/jpeg,image/png,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain`

### 2. Set Up Row Level Security (RLS) Policies

Create the following RLS policies for the `staff-documents` bucket:

#### Policy 1: Business Owner Upload Access

```sql
CREATE POLICY "Business owners can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'staff-documents'
  AND auth.uid() IN (
    SELECT id FROM business_owners
    WHERE id = (storage.foldername(name))[1]::uuid
  )
);
```

#### Policy 2: Business Owner Read Access

```sql
CREATE POLICY "Business owners can read their documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'staff-documents'
  AND auth.uid() IN (
    SELECT id FROM business_owners
    WHERE id = (storage.foldername(name))[1]::uuid
  )
);
```

#### Policy 3: Business Owner Delete Access

```sql
CREATE POLICY "Business owners can delete their documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'staff-documents'
  AND auth.uid() IN (
    SELECT id FROM business_owners
    WHERE id = (storage.foldername(name))[1]::uuid
  )
);
```

## 🛡️ Security Features Implemented

### 1. Private Bucket with Signed URLs

- **No Public Access**: Documents are stored in a private bucket
- **Signed URLs**: Temporary, secure URLs generated on-demand
- **Time-Limited Access**: URLs expire after 1 hour
- **Business Isolation**: Each business can only access their own documents

### 2. File Path Security

```typescript
// File paths follow this secure pattern:
staff-documents/{businessId}/{staffId}_{documentType}_{timestamp}.{extension}

// Example:
staff-documents/123e4567-e89b-12d3-a456-426614174000/staff_456_contract_1703123456789.pdf
```

### 3. Access Control Layers

1. **Authentication**: User must be logged in
2. **Business Ownership**: User must own the business
3. **Document Ownership**: Document must belong to the business
4. **File Path Validation**: Additional check on file path structure
5. **Signed URL Generation**: Temporary access only

### 4. File Upload Security

- **File Type Validation**: Only allowed MIME types accepted
- **File Size Limits**: Maximum 10MB per file
- **Filename Sanitization**: Prevents path traversal attacks
- **Unique Naming**: Timestamp-based naming prevents conflicts

## 🔧 Implementation Details

### Secure Upload Process

1. **Validation**: File type, size, and user permissions checked
2. **Secure Path Generation**: Business-isolated file paths created
3. **Storage**: File uploaded to private bucket
4. **Database Record**: Metadata stored with file path (not public URL)

### Secure Download Process

1. **Authentication**: User identity verified
2. **Authorization**: Business ownership confirmed
3. **Document Verification**: Document belongs to business
4. **Path Validation**: File path structure validated
5. **Signed URL**: Temporary access URL generated
6. **Access**: User gets 1-hour access to document

### File Deletion Security

1. **Database Cleanup**: Document record removed
2. **Storage Cleanup**: Physical file deleted from bucket
3. **Error Handling**: Graceful handling if storage deletion fails

## 🚨 Security Considerations

### What This Protects Against

- ✅ **Unauthorized Access**: Only business owners can access their documents
- ✅ **Direct File Access**: No public URLs that can be shared
- ✅ **Cross-Business Access**: Businesses cannot access each other's documents
- ✅ **Path Traversal**: Filename sanitization prevents directory attacks
- ✅ **Long-term Exposure**: Signed URLs expire automatically

### Additional Recommendations

1. **Regular Audits**: Monitor access logs in Supabase
2. **Backup Strategy**: Implement regular backups of critical documents
3. **Compliance**: Ensure setup meets your industry's compliance requirements
4. **User Training**: Train users on secure document handling practices

## 🔍 Testing Security

### Verify Private Bucket Setup

1. Try accessing a document URL directly - should fail
2. Check that signed URLs expire after 1 hour
3. Verify cross-business access is blocked
4. Test file upload restrictions

### Security Checklist

- [ ] Bucket is set to private (not public)
- [ ] RLS policies are enabled and configured
- [ ] File uploads are restricted by type and size
- [ ] Signed URLs are being used for access
- [ ] Cross-business access is blocked
- [ ] File paths follow the secure pattern
- [ ] Document deletion removes both DB record and file

## 📞 Troubleshooting

### Common Issues

1. **"Failed to upload file"**

   - Check bucket permissions
   - Verify RLS policies
   - Ensure bucket name matches code

2. **"Failed to generate download link"**

   - Check if bucket is private
   - Verify file path exists
   - Check RLS policies for SELECT

3. **"Access denied"**
   - Verify user authentication
   - Check business ownership
   - Validate file path structure

### Debug Steps

1. Check Supabase logs for detailed error messages
2. Verify bucket configuration in Supabase dashboard
3. Test with a simple file upload/download
4. Check browser network tab for API responses

## 🔄 Migration from Public Bucket

If you previously had a public bucket:

1. **Create New Private Bucket**: Follow setup above
2. **Update Code**: Ensure using signed URLs
3. **Migrate Files**: Move files to new bucket structure
4. **Update Database**: Update file_url fields with new paths
5. **Test Thoroughly**: Verify all functionality works
6. **Delete Old Bucket**: Remove public bucket after migration

This security setup ensures that your staff documents are properly protected while maintaining ease of use for authorized users.
