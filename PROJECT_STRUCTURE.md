# Cấu Trúc Project Hanabi_BE - TypeScript

## Cấu trúc thư mục src/:

```
src/
├── 📄 index.ts                     # Entry point chính của ứng dụng
├── 📁 config/                      # Cấu hình ứng dụng
│   └── 📄 db.ts                   # Cấu hình database connection
├── 📁 controllers/                 # Controllers xử lý business logic
│   ├── 📄 index.ts                # Export tất cả controllers
│   └── 📄 user.controller.ts      # User controller
├── 📁 helpers/                     # Helper functions tiện ích
│   └── 📄 upload-media.ts         # Helper cho upload media
├── 📁 middleware/                  # Middleware functions
│   ├── 📄 auth.ts                 # Authentication middleware
│   └── 📄 multer.ts               # File upload middleware
├── 📁 models/                      # Data models & schemas
│   └── 📄 index.ts                # Export tất cả models
├── 📁 routes/                      # API route definitions
│   ├── 📄 index.ts                # Main router
│   └── 📄 user.route.ts           # User routes
├── 📁 socket/                      # Socket.IO event handlers
│   └── 📄 socket.ts               # Socket connection & events
├── 📁 types/                       # TypeScript type definitions
│   └── 📄 index.ts                # Interface & type definitions
├── 📁 utils/                       # Utility functions
│   ├── 📄 cloudinary.ts           # Cloudinary integration
│   ├── 📄 datauri.ts              # Data URI conversion
│   └── 📄 db.ts                   # Database utility functions
└── 📁 validators/                  # Input validation schemas
    └── 📄 index.ts                # Validation rules & schemas
```

## Mô tả chi tiết các thư mục:

### � **src/index.ts**
- Entry point chính của ứng dụng
- Khởi tạo Express server
- Setup middleware, routes, error handling
- Start server và listen trên port

### 📁 **config/**
- Chứa các file cấu hình ứng dụng
- `db.ts`: Database connection setup (MongoDB, MySQL, etc.)
- Environment-specific configurations

### 📁 **controllers/**
- Business logic xử lý các request
- `user.controller.ts`: Xử lý các thao tác liên quan đến user
- Pattern: Controller nhận request → xử lý logic → trả về response

### � **helpers/**
- Các function tiện ích được sử dụng nhiều nơi
- `upload-media.ts`: Logic xử lý upload file, media
- Shared utility functions

### 📁 **middleware/**
- Các middleware functions cho Express
- `auth.ts`: Authentication & authorization middleware
- `multer.ts`: File upload handling middleware
- Custom middleware cho các tính năng cụ thể

### � **models/**
- Data models, schemas cho database
- Define structure của data
- Database entity definitions
- ORM/ODM model definitions

### 📁 **routes/**
- API route definitions
- `index.ts`: Main router tổng hợp
- `user.route.ts`: Routes cho user endpoints
- Define API endpoints và link với controllers

### � **socket/**
- Socket.IO event handlers
- `socket.ts`: Real-time communication logic
- WebSocket connection management
- Event handling cho real-time features

### 📁 **types/**
- TypeScript type definitions
- Interface definitions
- Custom types cho ứng dụng
- Shared type definitions across modules

### � **utils/**
- Utility functions
- `cloudinary.ts`: Cloud storage integration
- `datauri.ts`: Data URI conversion utilities
- `db.ts`: Database helper functions
- Common utility functions

### 📁 **validators/**
- Input validation schemas
- Request validation rules
- Data validation logic
- Schema definitions cho input validation

## Import patterns với path mapping:

```typescript
// Thay vì import tương đối phức tạp:
import { UserController } from '../../../controllers/user.controller';
import { authMiddleware } from '../../../middleware/auth';

// Có thể sử dụng absolute imports:
import { UserController } from '@controllers/user.controller';
import { authMiddleware } from '@middleware/auth';
import { IUser } from '@types/index';
import { dbConfig } from '@config/db';
```

## Development workflow:

1. **Development**: `npm run dev`
   - Chạy với ts-node + nodemon
   - Hot reload khi có thay đổi file .ts
   - Type checking real-time

2. **Building**: `npm run build`
   - Compile TypeScript → JavaScript vào dist/
   - Type checking during build
   - Ready for production

3. **Production**: `npm start`
   - Chạy compiled JavaScript từ dist/
   - Optimal performance

## Coding conventions:

- **File naming**: kebab-case (user.controller.ts, auth.middleware.ts)
- **Class naming**: PascalCase (UserController, AuthMiddleware)
- **Function naming**: camelCase (getUserById, validateToken)
- **Interface naming**: PascalCase với prefix I (IUser, IGame)
- **Type naming**: PascalCase (GameStatus, CardColor)
