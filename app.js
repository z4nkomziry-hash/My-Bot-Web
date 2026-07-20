// KrdDown - All Functions in One File
let currentVideoUrl = '';
let albumImages = [];

// Show welcome modal on load
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('welcomeModal').classList.add('show');
    }, 500);
    
    // Check saved theme
    if (localStorage.getItem('krd_theme') === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('themeIcon').className = 'fa-solid fa-sun';
    }
});

// ===== WELCOME MODAL =====
function selectNetwork(name) {
    document.getElementById('welcomeModal').classList.remove('show');
    toast('✅ ' + name + ' هەڵبژێردرا');
}

// ===== THEME =====
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('krd_theme', isLight ? 'light' : 'dark');
    document.getElementById('themeIcon').className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// ===== TOAST =====
function toast(msg) {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, 2500);
}

// ===== PASTE =====
function pasteLink() {
    if (!navigator.clipboard) return;
    navigator.clipboard.readText().then(text => {
        document.getElementById('videoUrl').value = text;
        toast('📋 لینک پەیست کرا');
    }).catch(() => {});
}

// ===== FORCE DOWNLOAD =====
function forceDownload(url) {
    window.open(url, '_blank');
    toast('📥 داونلۆد دەستی پێکرد');
}

// ===== MAIN DOWNLOAD =====
async function downloadVideo() {
    const url = document.getElementById('videoUrl').value.trim();
    if (!url) return toast('⚠️ تکایە لینکی ڤیدیۆ بنووسە');

    const btn = document.getElementById('downloadBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin ml-2"></i> چاوەڕێ بە...';

    // Hide previous results
    document.getElementById('previewCard').classList.add('hidden');
    document.getElementById('photoCard').classList.add('hidden');

    try {
        // Try TikTok API first
        const res = await fetch('https://www.tikwm.com/api/?url=' + encodeURIComponent(url));
        const data = await res.json();

        if (data.code === 0 && data.data) {
            const d = data.data;
            
            if (d.images && d.images.length > 0) {
                // Photo album
                albumImages = d.images;
                showPhotos(d.images);
            } else {
                // Video
                currentVideoUrl = d.play || d.hdplay;
                showPreview(d);
            }
            toast('✅ سەرکەوتوو بوو!');
        } else {
            // Try Cobalt API for other platforms
            const cRes = await fetch('https://api.cobalt.tools/api/json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url, vQuality: '720' })
            });
            const cData = await cRes.json();
            
            if (cData.url) {
                currentVideoUrl = cData.url;
                showSimplePreview(cData.url);
                toast('✅ سەرکەوتوو بوو!');
            } else if (cData.picker && cData.picker.length > 0) {
                albumImages = cData.picker.map(i => i.url);
                showPhotos(albumImages);
                toast('✅ سەرکەوتوو بوو!');
            } else {
                toast('❌ نەتوانرا داونلۆد بکرێت');
            }
        }
    } catch(e) {
        toast('❌ کێشەیەک ڕوویدا، دووبارە هەوڵبدە');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-download ml-2"></i> دابەزێنە';
}

// ===== SHOW VIDEO PREVIEW =====
function showPreview(data) {
    document.getElementById('previewCard').classList.remove('hidden');
    document.getElementById('previewVideo').src = data.play || currentVideoUrl;
    document.getElementById('previewAuthor').textContent = data.author?.nickname || 'نەناسراو';
    document.getElementById('previewDesc').textContent = data.title || '';
    document.getElementById('dlBtn').onclick = () => forceDownload(data.play || currentVideoUrl);
    document.getElementById('audioBtn').onclick = () => forceDownload(data.music);
    document.getElementById('previewCard').scrollIntoView({ behavior: 'smooth' });
}

function showSimplePreview(url) {
    document.getElementById('previewCard').classList.remove('hidden');
    document.getElementById('previewVideo').src = url;
    document.getElementById('previewAuthor').textContent = 'ئامادەی داونلۆد';
    document.getElementById('previewDesc').textContent = '';
    document.getElementById('dlBtn').onclick = () => forceDownload(url);
    document.getElementById('audioBtn').onclick = () => forceDownload(url);
    document.getElementById('previewCard').scrollIntoView({ behavior: 'smooth' });
}

// ===== SHOW PHOTOS =====
function showPhotos(images) {
    document.getElementById('photoCard').classList.remove('hidden');
    const grid = document.getElementById('photoGrid');
    grid.innerHTML = images.map((url, i) =>
        '<div class="relative group rounded-lg overflow-hidden">' +
        '<img src="https://images.weserv.nl/?url=' + encodeURIComponent(url) + '" class="w-full aspect-square object-cover" loading="lazy">' +
        '<button onclick="forceDownload(\'' + url + '\')" class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-xs font-bold">داونلۆد</button>' +
        '</div>'
    ).join('');
    document.getElementById('photoCard').scrollIntoView({ behavior: 'smooth' });
}
