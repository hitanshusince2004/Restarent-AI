export interface JwtPayload {
  /** User ID */
  sub: string;
  /** User email */
  email: string;
  /** Token type */
  type: 'access' | 'refresh';
  /** Issued at */
  iat?: number;
  /** Expires at */
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
