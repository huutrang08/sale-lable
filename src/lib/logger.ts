import { query } from '@/lib/db-server';

export async function logException(request: Request, error: any, customPayload?: any) {
  try {
    const endpoint = new URL(request.url).pathname;
    const method = request.method;
    
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || null;
    
    // Attempt to parse payload if passed, else just keep as is
    let payloadStr = null;
    if (customPayload) {
        payloadStr = JSON.stringify(customPayload);
    }
    
    await query(
      `INSERT INTO sales.system_exceptions (endpoint, method, error_message, error_stack, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [endpoint, method, errorMessage, errorStack, payloadStr]
    );
  } catch (logErr) {
    // Failsafe so the logger itself doesn't crash the API entirely
    console.error('CRITICAL: Failed to write to system_exceptions:', logErr);
  }
}
