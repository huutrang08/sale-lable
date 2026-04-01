import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.JWT_SECRET || 'shiplabel-super-secret-key-32chars!';
const encodedKey = new TextEncoder().encode(secretKey);

export async function createSession(payload: any) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);
    
  // Await the cookies() function in next 15+! Wait, next 15? The instruction stated app directory rules.
  // Next 15+ cookies() is async, Next 14- it is sync. Let's handle it asynchronously just in case or use standard.
  // Let's use standard try/catch if cookies() returns a promise.
  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.HTTPS === 'true', // chỉ bật khi chạy sau HTTPS/nginx
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie) return null;
  
  try {
    const { payload } = await jwtVerify(sessionCookie.value, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
