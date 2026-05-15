// GET /api/health — liveness check (requires auth, used by SPA bootstrap)
export const onRequestGet = async () => {
  return new Response(JSON.stringify({ ok: true, time: new Date().toISOString() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
