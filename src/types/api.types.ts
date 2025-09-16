//list interface : ApiResponse, ApiError
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}
