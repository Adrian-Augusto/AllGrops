import { assert } from 'console';
import * as assertStrict from 'assert';
import { UploadService } from './src/common/services/upload.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

// Mock ConfigService
class MockConfigService extends ConfigService {
  private config: Record<string, string> = {
    CLOUDINARY_CLOUD_NAME: 'dz94ddnx7',
    CLOUDINARY_API_KEY: '686269116162263',
    CLOUDINARY_API_SECRET: 'SFrYx_qrhqvHqUfzHkrYJCMx28c',
  };

  override get(key: string): any {
    return this.config[key];
  }
}

async function runTests() {
  console.log('🧪 RUNNING UPLOAD SERVICE TESTS...\n');

  const configService = new MockConfigService();
  const uploadService = new UploadService(configService);

  // Test Case 1: Already a URL
  console.log('Test 1: Already a URL (Should skip upload and return as-is)');
  const url = 'https://res.cloudinary.com/dz94ddnx7/image/upload/v12345/test.jpg';
  const result1 = await uploadService.uploadBase64Image(url);
  assertStrict.strictEqual(result1, url);
  console.log('✅ Test 1 Passed!');

  // Test Case 2: Invalid base64 prefix format
  console.log('\nTest 2: Invalid Base64 Prefix (Should fail with format error)');
  const invalidBase64 = 'data:text/plain;base64,SGVsbG8=';
  try {
    await uploadService.uploadBase64Image(invalidBase64);
    assertStrict.fail('Should have failed with BadRequestException');
  } catch (error: any) {
    assertStrict.ok(error instanceof BadRequestException);
    assertStrict.strictEqual(error.message, 'Formato da foto inválido');
    console.log('✅ Test 2 Passed!');
  }

  // Test Case 3: Too large base64 image (exceeds 5MB)
  console.log('\nTest 3: File Too Large (Should fail with size error)');
  // Create a large base64 mock string (~5.5MB of data)
  const largeBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(6 * 1024 * 1024);
  try {
    await uploadService.uploadBase64Image(largeBase64);
    assertStrict.fail('Should have failed with BadRequestException');
  } catch (error: any) {
    assertStrict.ok(error instanceof BadRequestException);
    assertStrict.strictEqual(error.message, 'Foto não pode exceder 5MB');
    console.log('✅ Test 3 Passed!');
  }

  // Test Case 4: Invalid URL Protocol
  console.log('\nTest 4: Invalid URL Protocol (Should fail with protocol error)');
  const invalidUrl = 'ftp://malicious-site.com/evil.jpg';
  try {
    await uploadService.uploadBase64Image(invalidUrl);
    assertStrict.fail('Should have failed with BadRequestException');
  } catch (error: any) {
    assertStrict.ok(error instanceof BadRequestException);
    assertStrict.strictEqual(error.message, 'URL da foto inválida (apenas HTTP/HTTPS são permitidos)');
    console.log('✅ Test 4 Passed!');
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
