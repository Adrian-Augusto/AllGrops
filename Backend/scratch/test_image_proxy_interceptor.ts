import { ImageProxyInterceptor } from '../src/modules/upload/image-proxy.interceptor';

const interceptor = new ImageProxyInterceptor();

const testData = {
  id: 'group-1',
  name: 'Test Group 1',
  photoUrl: 'https://lh3.googleusercontent.com/d/12345=s220',
  createdBy: {
    id: 'user-1',
    profileImage: 'https://lh3.googleusercontent.com/a/abcdef=s96-c',
    email: 'user1@gmail.com',
  },
  otherImage: 'https://example.com/other-image.jpg', // Should NOT be wrapped
  posts: [
    {
      id: 'post-1',
      photo: 'https://google.com/images/something.png',
    },
    {
      id: 'post-2',
      photo: 'https://other-site.com/image.png', // Should NOT be wrapped
    }
  ]
};

console.log('Original response data:\n', JSON.stringify(testData, null, 2));

const processed = (interceptor as any).processResponse(testData);

console.log('\nProcessed response data:\n', JSON.stringify(processed, null, 2));

// Assertions
const passPhotoUrl = processed.photoUrl.startsWith('/api/v1/images/proxy?url=');
const passProfileImage = processed.createdBy.profileImage.startsWith('/api/v1/images/proxy?url=');
const passPostPhoto1 = processed.posts[0].photo.startsWith('/api/v1/images/proxy?url=');
const passOtherImage = processed.otherImage === 'https://example.com/other-image.jpg';
const passPostPhoto2 = processed.posts[1].photo === 'https://other-site.com/image.png';

console.log('\n--- TESTS ---');
console.log('Wrap Google photoUrl:', passPhotoUrl ? '✅ PASS' : '❌ FAIL');
console.log('Wrap Google profileImage:', passProfileImage ? '✅ PASS' : '❌ FAIL');
console.log('Wrap Google post photo:', passPostPhoto1 ? '✅ PASS' : '❌ FAIL');
console.log('Do not wrap non-Google otherImage:', passOtherImage ? '✅ PASS' : '❌ FAIL');
console.log('Do not wrap non-Google post photo:', passPostPhoto2 ? '✅ PASS' : '❌ FAIL');

if (passPhotoUrl && passProfileImage && passPostPhoto1 && passOtherImage && passPostPhoto2) {
  console.log('\n🎉 ALL TESTS PASSED!');
  process.exit(0);
} else {
  console.error('\n❌ SOME TESTS FAILED!');
  process.exit(1);
}
