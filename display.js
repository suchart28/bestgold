import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
const GOOGLE_DRIVE_API_URL = "https://script.google.com/macros/s/AKfycbyLStJBYIUXldXaakNxgWrXtcCsukvmpycdHFhvOjqBFXescjaHsQUTOYPoHBJqEjY/exec";
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyDMMwciq6QoLSaWK6xfdr0U3ynyahtoaSk",
  authDomain: "studio-a33fe.firebaseapp.com",
  databaseURL: "https://studio-a33fe-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "studio-a33fe",
  messagingSenderId: "753539109404",
  appId: "1:753539109404:web:0d5b9f468294dacce645d9",
  measurementId: "G-WSYVYGNGCZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const branchId = urlParams.get('branch') || '1';

let currentPlaylist = [];
let currentMediaIndex = 0;
let imageTimer = null;

const IMAGE_DURATION = 10000; 
const FADE_DURATION = 1000;   

function formatToIntegerPrice(priceStr) {
    if (!priceStr) return "-";
    const cleanStr = priceStr.toString().replace(/,/g, '');
    const num = Math.round(parseFloat(cleanStr));
    return isNaN(num) ? "-" : num.toLocaleString('en-US');
}

// ฟังก์ชันดึงราคา API สำหรับทองคำแท่ง (Auto)
async function fetchGoldTradersPrice() {
    try {
        const response = await fetch('https://api.chnwt.dev/thai-gold-api/latest');
        const data = await response.json();
        if (data.status !== "success") throw new Error("ไม่สามารถดึงข้อมูลจาก API ได้");

        const prices = data.response.price;
        
        let updateDate = data.response.date;
        if (!updateDate || updateDate === "undefined") {
            const today = new Date();
            updateDate = today.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
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
        console.error("เกิดข้อผิดพลาดในการดึงราคาจาก API:", error);
        return null; 
    }
}

// ---------------------------------------------------
// ระบบสลับหน้าจอทุกๆ 5 นาที (300,000 มิลลิวินาที)
// ---------------------------------------------------
let currentPage = 1;
setInterval(() => {
    if (currentPage === 1) {
        document.getElementById('page-1').style.display = 'none';
        document.getElementById('page-2').style.display = 'block';
        currentPage = 2;
    } else {
        document.getElementById('page-1').style.display = 'block';
        document.getElementById('page-2').style.display = 'none';
        currentPage = 1;
    }
}, 3000); 

// ---------------------------------------------------
// ระบบเล่นสื่อ Drive
// ---------------------------------------------------
async function fetchMediaFromDrive() {
    try {
        const response = await fetch(GOOGLE_DRIVE_API_URL);
        const files = await response.json();
        if (files && files.length > 0) {
            if (JSON.stringify(files) !== JSON.stringify(currentPlaylist)) {
                currentPlaylist = files;
                currentMediaIndex = 0;
                document.getElementById('media-container').innerHTML = ''; 
                playCurrentMedia();
            }
        } else {
            currentPlaylist = [];
            document.getElementById('media-container').innerHTML = `<img src="default-bg.jpg" style="width: 100%; height: 100%; object-fit: fill;">`;
        }
    } catch (error) {
        console.error("เชื่อมต่อ Google Drive ไม่สำเร็จ:", error);
    }
}

function playCurrentMedia() {
    const mediaContainer = document.getElementById('media-container');

    if (currentPlaylist.length === 0) {
        mediaContainer.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#333; color:#fff; font-size:2vw;">กำลังโหลดสื่อ หรือไม่พบไฟล์...</div>`;
        return;
    }
    
    clearTimeout(imageTimer);
    
    if (currentMediaIndex >= currentPlaylist.length) {
        currentMediaIndex = 0; 
    }

    const currentFile = currentPlaylist[currentMediaIndex];

    if (currentFile.type === 'video') {
        mediaContainer.innerHTML = ''; 
        const videoEl = document.createElement('video');
        videoEl.id = 'signage-video';
        videoEl.src = currentFile.url;
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.style.cssText = "width: 100%; height: 100%; object-fit: fill; background-color: #000;";

        videoEl.onended = () => {
            currentMediaIndex++;
            playCurrentMedia();
        };

        videoEl.onerror = () => {
            currentMediaIndex++;
            playCurrentMedia();
        };

        mediaContainer.appendChild(videoEl);

        let playPromise = videoEl.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                currentMediaIndex++;
                playCurrentMedia();
            });
        }
        
    } else {
        if (mediaContainer.style.position !== 'relative') {
            mediaContainer.style.position = 'relative';
        }

        const existingImg = mediaContainer.querySelector('img.active-fader-img');
        const nextImg = document.createElement('img');
        nextImg.src = currentFile.url;
        nextImg.alt = "Signage Media";
        nextImg.className = "fader-img"; 
        nextImg.style.cssText = `position: absolute; top:0; left:0; width: 100%; height: 100%; object-fit: fill; opacity: 0; transition: opacity ${FADE_DURATION}ms ease-in-out;`;

        nextImg.onload = () => {
            if (existingImg) {
                nextImg.style.zIndex = "1";
                mediaContainer.appendChild(nextImg);
                existingImg.style.zIndex = "1";
                nextImg.style.zIndex = "2";
                void nextImg.offsetWidth; 
                nextImg.style.opacity = "1";
                existingImg.style.opacity = "0";
                existingImg.classList.remove('active-fader-img');
                nextImg.classList.add('active-fader-img');

                setTimeout(() => {
                    existingImg.remove();
                }, FADE_DURATION);
            } else {
                mediaContainer.innerHTML = ''; 
                nextImg.style.opacity = "1";
                nextImg.classList.add('active-fader-img');
                mediaContainer.appendChild(nextImg);
            }

            imageTimer = setTimeout(() => {
                currentMediaIndex++;
                playCurrentMedia();
            }, IMAGE_DURATION); 
        };
        
        nextImg.onerror = () => {
            currentMediaIndex++;
            playCurrentMedia();
        };
    }
}

fetchMediaFromDrive();
setInterval(fetchMediaFromDrive, 30000); 

// ---------------------------------------------------
// ระบบดึงข้อมูล Firebase (โหมดผสม: Manual + Auto)
// ---------------------------------------------------
let autoFetchInterval = null;

onSnapshot(doc(db, "branches", branchId), async (docSnap) => {
    if (docSnap.exists()) {
        const config = docSnap.data();
        
        // 1. อัปเดตข้อมูลแบบ Manual
        document.getElementById('gold-extract-buy').innerText = formatToIntegerPrice(config.goldExtractBuy || "-");
        document.getElementById('silver-extract-buy').innerText = formatToIntegerPrice(config.silverExtractBuy || "-");
        document.getElementById('ornament-buy').innerText = formatToIntegerPrice(config.ornamentBuy || "-");
        if (config.marquee) document.getElementById('marquee-text').innerText = config.marquee;

        // 2. อัปเดตข้อมูล Auto (ทองคำแท่ง)
        const updateAutoPrice = async () => {
            const goldPrice = await fetchGoldTradersPrice();
            if (goldPrice && goldPrice.barBuy !== "-") {
                document.getElementById('bar-buy').innerText = goldPrice.barBuy;
                document.getElementById('update-time').innerText = goldPrice.updateTime;
            }
        };

        // โหลดราคาทองคำแท่งครั้งแรก
        await updateAutoPrice();

        // ตั้งเวลาเช็คราคาทองคำแท่งทุกๆ 1 นาที
        if (autoFetchInterval) clearInterval(autoFetchInterval);
        autoFetchInterval = setInterval(updateAutoPrice, 60000);
    }
});
