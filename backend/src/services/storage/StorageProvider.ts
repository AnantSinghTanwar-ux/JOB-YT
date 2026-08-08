export interface UploadSession {
  uploadUrl: string;
  fileId: string;
  expiresAt: Date;
}

export interface StorageProvider {
  /**
   * Generates a presigned URL for direct client-to-storage upload
   * @param fileName The original file name
   * @param contentType The MIME type of the file
   * @param folder The target folder prefix
   */
  generateUploadUrl(fileName: string, contentType: string, folder?: string): Promise<UploadSession>;

  /**
   * Generates a temporary read-only signed URL for a private file
   * @param fileId The unique ID/key of the file in storage
   * @param expiresInSeconds Expiration time in seconds
   */
  generateSignedReadUrl(fileId: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Deletes a file from storage
   * @param fileId The unique ID/key of the file
   */
  deleteFile(fileId: string): Promise<void>;
}
