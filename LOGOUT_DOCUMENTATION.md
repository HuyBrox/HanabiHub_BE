# Authentication API Documentation

## Logout Options

Hệ thống hiện hỗ trợ 2 loại logout khác nhau:

### 1. Logout Current Device Only
**Endpoint:** `POST /auth/logout`
**Description:** Chỉ logout thiết bị hiện tại, các thiết bị khác vẫn đăng nhập

**Request:**
```json
{
  "refreshToken": "your_refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout from current device successful",
  "data": null,
  "timestamp": "2025-09-13T..."
}
```

**Use case:** User muốn logout khỏi một thiết bị cụ thể nhưng vẫn giữ đăng nhập ở các thiết bị khác.

### 2. Logout All Devices
**Endpoint:** `POST /auth/logout-all`
**Description:** Logout tất cả thiết bị, thu hồi toàn bộ refresh token

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout from all devices successful",
  "data": null,
  "timestamp": "2025-09-13T..."
}
```

**Use case:** User nghi ngờ tài khoản bị hack, hoặc muốn logout khỏi tất cả thiết bị để bảo mật.

## Security Flow

### Current Device Logout:
1. User gửi refresh token trong request body
2. Server verify refresh token có hợp lệ không
3. Server xóa refresh token khỏi database
4. Access token sẽ tự hết hạn sau 15 phút
5. Thiết bị này không thể refresh token nữa → logout

### All Devices Logout:
1. Server trực tiếp xóa refresh token khỏi database
2. Tất cả thiết bị sẽ không thể refresh token
3. Khi access token hết hạn (15 phút), tất cả thiết bị sẽ phải login lại

## Frontend Implementation Example

```javascript
// Logout current device
const logoutCurrentDevice = async () => {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    },
    body: JSON.stringify({ refreshToken })
  });

  if (response.ok) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Redirect to login
  }
};

// Logout all devices
const logoutAllDevices = async () => {
  const response = await fetch('/auth/logout-all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    }
  });

  if (response.ok) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Redirect to login
  }
};
```

## Notes

- Cả 2 endpoints đều yêu cầu authentication (Bearer token)
- `/auth/logout` cần refresh token trong body để verify
- `/auth/logout-all` không cần refresh token vì nó thu hồi toàn bộ
- Access token sẽ tự hết hạn sau 15 phút nên không cần blacklist
- Refresh token được lưu trong database để quản lý centralized
