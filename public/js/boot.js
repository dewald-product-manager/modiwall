
document.documentElement.classList.add('js');
try {
if (!sessionStorage.getItem('mw')) document.documentElement.classList.add('first');
sessionStorage.setItem('mw', '1');
} catch { /* storage blocked: no opening mark */ }
