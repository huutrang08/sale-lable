/**
 * cron-sync.js
 * 
 * Script này chạy độc lập ngoài Next.js. Nhiệm vụ của nó là gửi request POST định kỳ (hàng ngày)
 * đến API /api/admin/sync-services để đồng bộ tự động dữ liệu dịch vụ từ ShipLabel.net về CSDL của bạn.
 * 
 * Cách cài đặt Cronjob trên VPS Linux:
 * crontab -e
 * 0 2 * * * /usr/bin/node /path/to/your/project/cron-sync.js
 * (Chạy tự động vào 2h sáng mỗi ngày)
 */

const http = require('http');

// Thay đổi URL này thành tên miền thật của bạn khi lên mảng (VD: https://domain.com/api/admin/sync-services)
const SYNC_URL = 'http://localhost:3000/api/admin/sync-services';
const CRON_SECRET = 'shiplabel-cron-secret-123'; 

async function runSync() {
  console.log(`[${new Date().toISOString()}] Bắt đầu đồng bộ dịch vụ...`);
  
  try {
    const response = await fetch(SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-auth': CRON_SECRET 
      }
    });

    const data = await response.json();
    console.log(`[Kết quả]: HTTP ${response.status}`, data);
  } catch (err) {
    console.error(`[Lỗi]:`, err.message);
  }
}

runSync();
