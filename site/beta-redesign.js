(() => {
  const target = document.getElementById('beta-updated');
  if (!target) return;
  fetch('/data/trending.json', { cache: 'no-store' })
    .then((r) => r.ok ? r.json() : null)
    .then((data) => {
      if (!data?.generatedAt) { target.textContent = 'Chart refreshes every hour'; return; }
      const minutes = Math.max(0, Math.round((Date.now() - new Date(data.generatedAt).getTime()) / 60000));
      target.textContent = minutes < 1 ? 'Updated just now' : `Updated ${minutes} min${minutes === 1 ? '' : 's'} ago`;
    })
    .catch(() => { target.textContent = 'Chart refreshes every hour'; });
})();
