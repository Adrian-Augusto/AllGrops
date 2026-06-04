// Augment Express namespace with Multer types to satisfy TypeScript
declare namespace Express {
  namespace Multer {
    interface File {
      /** Name of the form field associated with this file */
      fieldname: string;
      /** Name of the file on the user's computer */
      originalname: string;
      /** Encoding type of the file */
      encoding: string;
      /** Mime type of the file */
      mimetype: string;
      /** Size of the file in bytes */
      size: number;
      /** Buffer containing the entire file */
      buffer: Buffer;
      /** Location of the file on disk (if stored) */
      destination?: string;
      /** Full path to the stored file */
      path?: string;
    }
  }
}
