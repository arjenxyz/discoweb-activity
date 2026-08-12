/** Notify Discord bot process when global bot maintenance toggles. */
export async function syncBotMaintenanceToBot(active: boolean, reason?: string | null) {
  const botApiUrl = process.env.BOT_API_URL;
  if (!botApiUrl) return;

  try {
    await fetch(`${botApiUrl.replace(/\/$/, '')}/api/maintenance-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.BOT_API_KEY
          ? { Authorization: `Bearer ${process.env.BOT_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({ active, reason: reason ?? null }),
    });
  } catch (err) {
    console.warn('[maintenance] bot maintenance-sync failed', err);
  }
}
