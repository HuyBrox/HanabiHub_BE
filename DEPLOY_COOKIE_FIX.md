# Hướng dẫn Deploy Fix Cookies cho Production

## Vấn đề

Production (incognito mode) bị lỗi 401 vì cookies không được gửi trong cross-origin requests.

## Giải pháp đã được implement

Backend đã được cập nhật với:
1. ✅ Cookie helper tự động detect production/HTTPS/cross-origin
2. ✅ Tự động set `SameSite=None; Secure` khi cần
3. ✅ Trust proxy để detect HTTPS từ headers
4. ✅ Logging chi tiết để debug

## Bước 1: Deploy Backend lên Render

### 1.1. Commit và push code mới

```bash
cd BE_Hanabi
git add .
git commit -m "Fix: Cookie SameSite=None for cross-origin requests in production"
git push origin main
```

### 1.2. Kiểm tra Environment Variables trên Render

Vào Render Dashboard → Service → Environment và đảm bảo có:

```
NODE_ENV=production
FRONTEND_URL=https://hanabi-hub.vercel.app
```

**QUAN TRỌNG:**
- `NODE_ENV=production` phải được set
- `FRONTEND_URL` phải đúng với domain frontend của bạn

### 1.3. Deploy

Render sẽ tự động deploy khi bạn push code. Hoặc bạn có thể trigger manual deploy.

## Bước 2: Kiểm tra Backend Logs

Sau khi deploy, kiểm tra logs trên Render để xem cookies có được set đúng không:

1. Vào Render Dashboard → Service → Logs
2. Thực hiện login từ frontend
3. Tìm log: `[Cookie] Set access token cookie:`
4. Kiểm tra:
   - `secure: true`
   - `sameSite: "none"`
   - `isHttps: true` hoặc `isCrossOrigin: true`

**Ví dụ log đúng:**
```
[Cookie] Set access token cookie: {
  secure: true,
  sameSite: 'none',
  isHttps: true,
  isCrossOrigin: true,
  isProduction: true,
  nodeEnv: 'production',
  forwardedProto: 'https',
  origin: 'https://hanabi-hub.vercel.app',
  host: 'hana-api.onrender.com'
}
```

## Bước 3: Test trên Frontend

### 3.1. Clear cookies cũ (nếu có)

1. Mở DevTools (F12)
2. Application → Cookies
3. Xóa tất cả cookies của `hana-api.onrender.com`

### 3.2. Test trong Incognito Mode

1. Mở trình duyệt ẩn danh
2. Truy cập frontend production
3. Login
4. Kiểm tra:

**Trong DevTools → Network:**
- Request `/api/v1/login` → Response Headers có `Set-Cookie` với `SameSite=None; Secure`
- Request `/api/v1/user/profile` → Request Headers có `Cookie: token=...`

**Trong DevTools → Application → Cookies:**
- Cookies của `hana-api.onrender.com` có:
  - `SameSite: None`
  - `Secure: ✓`
  - `HttpOnly: ✓`

### 3.3. Kiểm tra Console Logs

Nếu vẫn lỗi, kiểm tra console logs:
- `[Auth API] 401 Unauthorized` → Xem thông tin chi tiết
- `[Auth API] ⚠️ Cross-origin request without cookies` → Backend chưa set cookies đúng

## Bước 4: Troubleshooting

### Vấn đề 1: Cookies vẫn không được gửi

**Nguyên nhân có thể:**
- Backend chưa được deploy với code mới
- `NODE_ENV` không được set trên Render
- `FRONTEND_URL` không đúng

**Giải pháp:**
1. Kiểm tra backend logs xem có log `[Cookie] Set access token cookie` không
2. Nếu không có log → Backend chưa được deploy
3. Nếu có log nhưng `sameSite: "lax"` → `NODE_ENV` chưa được set

### Vấn đề 2: Cookies được set nhưng vẫn 401

**Nguyên nhân có thể:**
- Cookies được set nhưng không được gửi (SameSite policy)
- Token invalid/expired

**Giải pháp:**
1. Kiểm tra cookies trong DevTools → Application
2. Kiểm tra `SameSite` có phải `None` không
3. Kiểm tra `Secure` có được bật không
4. Kiểm tra backend logs xem có nhận được cookies không

### Vấn đề 3: Backend logs không có

**Nguyên nhân:**
- Backend chưa được deploy
- Code mới chưa được build

**Giải pháp:**
1. Kiểm tra build logs trên Render
2. Đảm bảo `npm run build` thành công
3. Đảm bảo code mới được deploy

## Checklist

- [ ] Code mới đã được commit và push
- [ ] Backend đã được deploy lên Render
- [ ] `NODE_ENV=production` đã được set trên Render
- [ ] `FRONTEND_URL` đã được set đúng trên Render
- [ ] Backend logs hiển thị cookies được set với `SameSite=None; Secure`
- [ ] Test trong incognito mode thành công
- [ ] Cookies hiển thị đúng trong DevTools

## Lưu ý

1. **Render có thể mất vài phút để deploy** - Đợi deploy xong mới test
2. **Clear cookies cũ** trước khi test - Cookies cũ có thể có `SameSite=Lax`
3. **Incognito mode** là cách test tốt nhất - Nó không có cookies từ sessions trước
4. **Backend logs** là cách debug tốt nhất - Xem cookies có được set đúng không

## Tài liệu tham khảo

- [COOKIE_ISSUES.md](../FE_Hanabi/COOKIE_ISSUES.md) - Chi tiết về vấn đề cookies
- [MDN: SameSite cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)

