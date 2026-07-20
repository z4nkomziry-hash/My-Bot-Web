// ============================================
// KRD-ProDown - Complete App.js
// All download functions in one file
// ============================================

let currentVideoUrl = '';
let albumImages = [];
let currentPlatform = '';

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', () => {
    // Check saved theme
    if (localStorage.getItem('krdpro_theme') === 'light') {
        document.body.classList.add('light-mode');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.className = 'fa-solid fa-sun text-xs';
    }
});

// ===== PLATFORM SELECTION =====
function selectPlatform(name) {
    currentPlatform = name;
    const modal = document.getElementById('welcomeModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    toast('✅ ' + name + ' هەڵبژێردرا');
}

// ===== THEME TOGGLE =====
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('krdpro_theme', isLight ? 'light' : 'dark');
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = isLight ? 'fa-solid fa-sun text-xs' : 'fa-solid fa-moon text-xs';
    }
}

// ===== TOAST NOTIFICATION =====
function toast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ===== PASTE FROM CLIPBOARD =====
function pasteLink() {
    if (!navigator.clipboard) {
        toast('❌ وێبگەڕەکەت پشتگیری پەیست ناکات');
        return;
    }
    
    navigator.clipboard.readText().then(text => {
        const input = document.getElementById('videoUrl');
        if (input) {
            input.value = text;
            toast('📋 لینک پەیست کرا');
        }
    }).catch(() => {
        toast('❌ ناتوانرێت پەیست بکرێت');
    });
}

// ===== DOWNLOAD WITH QUALITY =====
function downloadQuality(quality) {
    if (!currentVideoUrl) {
        toast('⚠️ سەرەتا ڤیدیۆ بدۆزەرەوە');
        return;
    }
    
    toast('📥 کوالێتی ' + quality + ' داونلۆد دەکرێت...');
    
    const a = document.createElement('a');
    a.href = currentVideoUrl;
    a.download = 'KRD-ProDown_' + quality + '.mp4';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ===== DOWNLOAD ALL PHOTOS =====
function downloadAllPhotos() {
    if (!albumImages || albumImages.length === 0) {
        toast('⚠️ هیچ وێنەیەک نییە');
        return;
    }
    
    albumImages.forEach((url, i) => {
        setTimeout(() => {
            const a = document.createElement('a');
            a.href = url;
            a.download = 'KRD-ProDown_photo_' + (i + 1) + '.jpg';
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }, i * 400);
    });
    
    toast('📸 ' + albumImages.length + ' وێنە داونلۆد دەکرێن');
}

// ===== MAIN DOWNLOAD FUNCTION =====
async function downloadVideo() {
    const input = document.getElementById('videoUrl');
    if (!input || !input.value.trim()) {
        toast('⚠️ تکایە لینکی ڤیدیۆ بنووسە');
        return;
    }
    
    const url = input.value.trim();
    const btn = document.getElementById('downloadBtn');
    const originalText = btn.innerHTML;
    
    // Disable button
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin ml-2"></i> چاوەڕێ بە...';
    
    // Hide previous results
    const previewCard = document.getElementById('previewCard');
    const photoCard = document.getElementById('photoCard');
    if (previewCard) previewCard.classList.add('hidden');
    if (photoCard) photoCard.classList.add('hidden');
    
    try {
        // STEP 1: Try TikTok API for TikTok URLs
        if (url.includes('tiktok.com') || url.includes('vm.tiktok') || url.includes('vt.tiktok')) {
            try {
                const apiUrl = 'https://www.tikwm.com/api/?url=' + encodeURIComponent(url);
                const response = await fetch(apiUrl);
                const data = await response.json();
                
                if (data.code === 0 && data.data) {
                    const video = data.data;
                    
                    // Check for photo album (slideshow)
                    if (video.images && video.images.length > 0) {
                        albumImages = video.images;
                        showPhotos(video.images);
                        toast('✅ ئەلبومی وێنەکان ئامادەیە!');
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                        return;
                    }
                    
                    // Get video URL (try HD first)
                    currentVideoUrl = video.hdplay || video.play || video.wmplay;
                    
                    if (currentVideoUrl) {
                        showPreview({
                            videoUrl: currentVideoUrl,
                            audioUrl: video.music,
                            author: video.author?.nickname || 'TikTok User',
                            title: video.title || 'TikTok Video',
                            platform: 'TikTok'
                        });
                        toast('✅ ڤیدیۆکە ئامادەیە!');
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                        return;
                    }
                }
            } catch (tiktokError) {
                console.log('TikTok API failed, trying alternative...');
            }
        }
        
        // STEP 2: Try Cobalt API for ALL platforms
        const cobaltResponse = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                vQuality: '720',
                filenamePattern: 'basic',
                isAudioOnly: false
            })
        });
        
        const cobaltData = await cobaltResponse.json();
        
        // Check for video URL
        if (cobaltData.url || cobaltData.status === 'redirect' || cobaltData.status === 'stream' || cobaltData.status === 'tunnel') {
            currentVideoUrl = cobaltData.url;
            
            showPreview({
                videoUrl: cobaltData.url,
                audioUrl: cobaltData.url,
                author: currentPlatform || 'Social Media',
                title: 'ئامادەی داونلۆد',
                platform: currentPlatform || 'Video'
            });
            
            toast('✅ سەرکەوتوو بوو!');
        }
        // Check for photo picker (multiple images)
        else if (cobaltData.status === 'picker' && cobaltData.picker && cobaltData.picker.length > 0) {
            albumImages = cobaltData.picker.map(item => item.url);
            showPhotos(albumImages);
            toast('✅ ئەلبومی وێنەکان ئامادەیە!');
        }
        // No results
        else {
            toast('❌ نەتوانرا ڤیدیۆ داونلۆد بکرێت. تکایە لینکێکی تر تاقی بکەوە');
        }
        
    } catch (error) {
        console.error('Download error:', error);
        toast('❌ کێشەیەک ڕوویدا. تکایە دووبارە هەوڵبدە');
    }
    
    // Re-enable button
    btn.disabled = false;
    btn.innerHTML = originalText;
}

// ===== SHOW VIDEO PREVIEW =====
function showPreview(data) {
    const card = document.getElementById('previewCard');
    if (!card) return;
    
    card.classList.remove('hidden');
    
    const video = document.getElementById('previewVideo');
    const image = document.getElementById('previewImage');
    
    if (video) {
        video.classList.remove('hidden');
        video.src = data.videoUrl;
        video.load();
    }
    if (image) {
        image.classList.add('hidden');
    }
    
    const author = document.getElementById('previewAuthor');
    const desc = document.getElementById('previewDesc');
    const platform = document.getElementById('previewPlatform');
    
    if (author) author.textContent = data.author;
    if (desc) desc.textContent = data.title;
    if (platform) platform.textContent = data.platform;
    
    // Set download button
    const dlBtn = document.getElementById('dlBtn');
    if (dlBtn) {
        dlBtn.onclick = function() {
            const a = document.createElement('a');
            a.href = data.videoUrl;
            a.download = 'KRD-ProDown_video.mp4';
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast('📥 داونلۆد دەستی پێکرد');
        };
    }
    
    // Set audio button
    const audioBtn = document.getElementById('audioBtn');
    if (audioBtn) {
        audioBtn.onclick = function() {
            const a = document.createElement('a');
            a.href = data.audioUrl;
            a.download = 'KRD-ProDown_audio.mp3';
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast('🎵 دەنگ داونلۆد دەکرێت');
        };
    }
    
    // Scroll to preview
    card.scrollIntoView({ behavior: 'smooth' });
}

// ===== SHOW PHOTO ALBUM =====
function showPhotos(images) {
    const card = document.getElementById('photoCard');
    if (!card) return;
    
    card.classList.remove('hidden');
    
    const grid = document.getElementById('photoGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    images.forEach((url, i) => {
        const div = document.createElement('div');
        div.className = 'relative group rounded-xl overflow-hidden aspect-square bg-slate-800';
        
        const img = document.createElement('img');
        img.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(url);
        img.className = 'w-full h-full object-cover';
        img.loading = 'lazy';
        img.alt = 'Photo ' + (i + 1);
        
        const button = document.createElement('button');
        button.className = 'absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white text-xs font-bold';
        button.innerHTML = '<i class="fa-solid fa-download ml-1"></i> داونلۆد';
        button.onclick = function() {
            const a = document.createElement('a');
            a.href = url;
            a.download = 'KRD-ProDown_photo_' + (i + 1) + '.jpg';
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        
        div.appendChild(img);
        div.appendChild(button);
        grid.appendChild(div);
    });
    
    // Scroll to photos
    card.scrollIntoView({ behavior: 'smooth' });
}
