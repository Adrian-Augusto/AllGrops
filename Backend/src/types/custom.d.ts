// Custom TypeScript declarations to silence missing module errors
declare module 'cookie-parser';
declare module 'bcrypt';
declare module 'passport-google-oauth20';
declare module 'nodemailer';

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        /**
         * Buffer containing file data
         */
        buffer: Buffer;
        /** Original filename */
        originalname: string;
        /** Mimetype */
        mimetype: string;
        /** Size in bytes */
        size: number;
        /** Field name */
        fieldname: string;
      }
    }
  }
}
