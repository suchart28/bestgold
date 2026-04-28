import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDMMwciq6QoLSaWK6xfdr0U3ynyahtoaSk",
    authDomain: "studio-a33fe.firebaseapp.com",
    databaseURL: "https://studio-a33fe-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "studio-a33fe",
    messagingSenderId: "753539109404",
    appId: "1:753539109404:web:d38b9974e8307152e645d9",
    measurementId: "G-CLC8KLV29E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const branchId = urlParams.get('branch') || '1';

function formatToIntegerPrice(priceStr) {
    if (!priceStr) return "-";
    const cleanStr = priceStr.toString().replace(/,/g, '');
    const num = Math.round(parseFloat(cleanStr));
    return isNaN(num) ? "-" : num.toLocaleString('en-US');
}

// ---------------------------------------------------
// 1. ระบบดึงราคาทองคำแท่งอัตโนมัติจาก API
// ---------------------------------------------------
async function fetchGoldTradersPrice() {
    try {
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest');
        const data = await response.json();
        if (data.status !== "success") throw new Error("API Error");

        const prices = data.response.price;
        let updateDate = data.response.date;
        if (!updateDate || updateDate === "undefined") {
            updateDate = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
        } else {
            const d = new Date(updateDate);
            if (!isNaN(d)) updateDate = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        const updateTime = data.response.update_time || new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        return {
            barBuy: formatToIntegerPrice(prices.gold_bar.buy),
            updateTime: `อัพเดทราคาทองคำแท่ง: วันที่ ${updateDate} เวลา ${updateTime}`
        };
    } catch (error) {
        console.error("API Fetch Error:", error);
        return null; 
    }
}

// ---------------------------------------------------
// 2. ระบบสลับหน้าจอวนลูปทุก 1 นาที (60000 ms)
// ---------------------------------------------------
let currentPage = 1;
setInterval(() => {
    try {
        const page1 = document.getElementById('page-1');
        const page2 = document.getElementById('page-2');
        if (!page1 || !page2) return;

        if (currentPage === 1) {
            page1.style.display = 'none';
            page2.style.display = 'block';
            currentPage = 2;
        } else {
            page1.style.display = 'block';
            page2.style.display = 'none';
            currentPage = 1;
        }
    } catch (e) {
        console.error("Pagination Loop Error:", e);
    }
}, 60000);

// ---------------------------------------------------
// 3. ระบบ Media Player (รองรับ URL จาก Firebase)
// ---------------------------------------------------
let currentPlaylist = [];
let currentMediaIndex = 0;
let mediaTimer = null;
let lastMediaString = "";

function playNextMedia() {
    const container = document.getElementById('media-container');
    clearTimeout(mediaTimer);

    if (currentPlaylist.length === 0) {
        container.innerHTML = `<img src="default-bg.jpg" style="width: 100%; height: 100%; object-fit: fill;">`;
        return;
    }

    if (currentMediaIndex >= currentPlaylist.length) {
        currentMediaIndex = 0; // วนกลับไปไฟล์แรก
    }

    let fileUrl = currentPlaylist[currentMediaIndex];
    let isVideo = fileUrl.toLowerCase().includes('.mp4') || fileUrl.toLowerCase().includes('.webm');

    container.innerHTML = ''; 

    if (isVideo) {
        let videoEl = document.createElement('video');
        videoEl.src = fileUrl;
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.style.cssText = "width: 100%; height: 100%; object-fit: fill; background-color: #000;";
        
        videoEl.onended = () => { currentMediaIndex++; playNextMedia(); };
        videoEl.onerror = () => { currentMediaIndex++; playNextMedia(); };
        
        container.appendChild(videoEl);
    } else {
        let imgEl = document.createElement('img');
        imgEl.src = fileUrl;
        imgEl.style.cssText = "width: 100%; height: 100%; object-fit: fill;";
        
        imgEl.onload = () => {
            mediaTimer = setTimeout(() => {
                currentMediaIndex++; 
                playNextMedia();
            }, 10000); // โชว์รูปละ 10 วินาที
        };
        imgEl.onerror = () => { currentMediaIndex++; playNextMedia(); };
        
        container.appendChild(imgEl);
    }
}

// ---------------------------------------------------
// 4. ฟังข้อมูล Realtime จาก Firebase
// ---------------------------------------------------
let autoFetchInterval = null;

onSnapshot(doc(db, "branches", branchId), async (docSnap) => {
    if (docSnap.exists()) {
        const config = docSnap.data();
        
        // อัปเดตราคากำหนดเอง
        document.getElementById('gold-extract-buy').innerText = formatToIntegerPrice(config.goldExtractBuy || "-");
        document.getElementById('silver-extract-buy').innerText = formatToIntegerPrice(config.silverExtractBuy || "-");
        document.getElementById('ornament-buy').innerText = formatToIntegerPrice(config.ornamentBuy || "-");
        if (config.marquee) document.getElementById('marquee-text').innerText = config.marquee;

        // อัปเดตสื่อโฆษณา
        const newMediaString = config.mediaUrl || "";
        if (newMediaString !== lastMediaString) {
            lastMediaString = newMediaString;
            currentPlaylist = newMediaString.split(',').map(s => s.trim()).filter(s => s !== "");
            currentMediaIndex = 0; 
            playNextMedia(); 
        }

        // อัปเดตราคาทองคำแท่งอัตโนมัติ
        const updateAutoPrice = async () => {
            const goldPrice = await fetchGoldTradersPrice();
            if (goldPrice && goldPrice.barBuy !== "-") {
                document.getElementById('bar-buy').innerText = goldPrice.barBuy;
                document.getElementById('update-time').innerText = goldPrice.updateTime;
            }
        };

        await updateAutoPrice();
        if (autoFetchInterval) clearInterval(autoFetchInterval);
        autoFetchInterval = setInterval(updateAutoPrice, 60000);
    }
});
