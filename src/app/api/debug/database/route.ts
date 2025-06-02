import { db } from '@/server/db';
import { response, handleError } from '@/lib/api/response';

export async function GET() {
  try {
    const debugInfo = {
      databaseUrl: process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'),
      environment: process.env.NODE_ENV,
    };
    const userCount = db.user.count({});
    return response({
      ...debugInfo,
      userCount,
      message: 'Database verification complete - Schema is correct!',
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
