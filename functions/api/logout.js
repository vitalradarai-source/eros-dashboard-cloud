// POST /api/logout — clears the session cookie and redirects to login.
export const onRequestPost = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'eros_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    },
  });
};
export const onRequestGet = onRequestPost;
