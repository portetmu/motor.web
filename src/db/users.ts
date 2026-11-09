import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, fullName?: string) {
  try {
    const cleanName = fullName || email.split('@')[0] || 'Authenticated Rider';
    const cleanUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || `user_${uid.slice(0, 6)}`;

    const result = await db
      .insert(users)
      .values({
        uid,
        username: cleanUsername,
        fullName: cleanName,
        email,
        phone: '0917-501-1100',
        role: 'admin',
        status: 'Active',
        lastLogin: new Date().toISOString().slice(0, 16).replace('T', ' '),
        twoFactorEnabled: true,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          lastLogin: new Date().toISOString().slice(0, 16).replace('T', ' '),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database query failed in getUsers:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
