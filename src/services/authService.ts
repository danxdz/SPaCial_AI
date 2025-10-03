import { db } from './database';
import { encryption } from './encryption';
import { logger } from './logger';

export interface LoginCredentials {
  username: string;
  password?: string;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: number;
    username: string;
    role: string;
    group_id: number;
    group_name?: string;
    workstation_id: number;
    workstation_name?: string;
  workshop_id: number;
  workshop_name?: string;
  };
  error?: string;
  token?: string;
}

export interface SessionData {
  userId: number;
  username: string;
  role: string;
  loginTime: number;
  lastActivity: number;
  expiresAt: number;
}

class AuthService {
  private sessionTimeout = 2 * 60 * 60 * 1000; // 2 hours // 8 hours in milliseconds
  private sessionKey = 'spc_session';

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Database is initialized globally in App.tsx
      
      // Validate input
      if (!credentials.username?.trim()) {
        return {
          success: false,
          error: 'Username is required'
        };
      }

      // Check for brute force attempts
      const attempts = this.getLoginAttempts(credentials.username);
      if (attempts >= 5) {
        logger.logSecurity('LOGIN_BLOCKED', 'Too many failed attempts', credentials.username);
        return {
          success: false,
          error: 'Too many failed login attempts. Please try again later.'
        };
      }

      // Get user from database
      const userData = await db.queryAll(`
        SELECT u.id, u.username, u.password_hash, u.role, u.group_id, u.workstation_id, u.workshop_id,
               g.name as group_name, w.name as workstation_name, ws.name as workshop_name
        FROM users u
        LEFT JOIN groups g ON u.group_id = g.id
        LEFT JOIN workstations w ON u.workstation_id = w.id
        LEFT JOIN workshops ws ON u.workshop_id = ws.id
        WHERE u.username = ?
      `, [credentials.username]);

      if (userData.length === 0) {
        this.recordFailedAttempt(credentials.username);
        logger.logSecurity('LOGIN_FAILED', 'User not found', credentials.username);
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      const user = userData[0];

      // Check if this is a production user with no password
      const isProductionUser = user.role === 'prod';
      const hasPassword = user.password_hash && user.password_hash.trim() !== '';
      
      // Verify password (skip for production users without passwords)
      if (hasPassword) {
        const isValidPassword = await encryption.verifyPassword(credentials.password || '', user.password_hash);
        if (!isValidPassword) {
          this.recordFailedAttempt(credentials.username);
          logger.logSecurity('LOGIN_FAILED', 'Invalid password', credentials.username);
          return {
            success: false,
            error: 'Invalid username or password'
          };
        }
      } else if (!isProductionUser) {
        // Non-production users must have passwords
        this.recordFailedAttempt(credentials.username);
        logger.logSecurity('LOGIN_FAILED', 'No password set for non-production user', credentials.username);
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }
      // Production users without passwords can login without password verification

      // Clear failed attempts on successful login
      this.clearFailedAttempts(credentials.username);

      // Create session
      const sessionData: SessionData = {
        userId: user.id,
        username: user.username,
        role: user.role,
        loginTime: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + this.sessionTimeout
      };

      this.setSession(sessionData);

      // Update last login in database
      await db.updateLastLogin(user.id);

      // Log successful login
      logger.logSecurity('LOGIN_SUCCESS', 'User logged in', `${user.username} (${user.role})`);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          group_id: user.group_id,
          group_name: user.group_name,
          workstation_id: user.workstation_id,
          workstation_name: user.workstation_name,
          workshop_id: user.workshop_id,
          workshop_name: user.workshop_name
        },
        token: this.generateToken(sessionData)
      };

    } catch (error) {
      console.error('Login error:', error);
      logger.logSecurity('LOGIN_ERROR', 'Login system error', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: 'Login system error. Please try again.'
      };
    }
  }

  async logout(): Promise<void> {
    try {
      const session = this.getSession();
      if (session) {
        logger.logSecurity('LOGOUT', 'User logged out', `${session.username} (${session.userId})`);
      }
      this.clearSession();
      this.clearRememberMe();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async validateSession(): Promise<SessionData | null> {
    try {
      const session = this.getSession();
      if (!session) {
        return null;
      }

      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        logger.logSecurity('SESSION_EXPIRED', 'Session expired', `${session.username} (${session.userId})`);
        return null;
      }

      // Update last activity
      session.lastActivity = Date.now();
      this.setSession(session);

      return session;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Database is initialized globally in App.tsx

      // Validate new password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.error
        };
      }

      // Get current user
      const userData = await db.queryAll('SELECT password_hash FROM users WHERE id = ?', [userId]);
      if (userData.length === 0) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Verify current password
      const isValidPassword = await encryption.verifyPassword(currentPassword, userData[0].password_hash);
      if (!isValidPassword) {
        logger.logSecurity('PASSWORD_CHANGE_FAILED', 'Invalid current password', `User ${userId}`);
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Hash new password
      const newPasswordHash = await encryption.hashPassword(newPassword);

      // Update password in database
      await db.execute(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newPasswordHash, userId]
      );

      // Database automatically saved in Electron mode

      logger.logSecurity('PASSWORD_CHANGED', 'Password changed successfully', `User ${userId}`);

      return { success: true };

    } catch (error) {
      console.error('Change password error:', error);
      logger.logSecurity('PASSWORD_CHANGE_ERROR', 'Password change system error', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: 'Password change failed. Please try again.'
      };
    }
  }

  async resetPassword(username: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Database is initialized globally in App.tsx

      // Check if user exists
      const userData = await db.queryAll('SELECT id, username FROM users WHERE username = ?', [username]);
      if (userData.length === 0) {
        // Don't reveal if user exists or not for security
        return {
          success: true,
          error: undefined
        };
      }

      // Generate temporary password
      const tempPassword = this.generateTemporaryPassword();
      const tempPasswordHash = await encryption.hashPassword(tempPassword);

      // Update password in database
      await db.execute(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [tempPasswordHash, userData[0].id]
      );

      // Database automatically saved in Electron mode

      logger.logSecurity('PASSWORD_RESET', 'Password reset', `${userData[0].username} (${userData[0].id})`);

      // In a real application, you would send this via email
      // For now, we'll log it (remove this in production!)
      console.log(`Temporary password for ${username}: ${tempPassword}`);

      return { success: true };

    } catch (error) {
      console.error('Reset password error:', error);
      logger.logSecurity('PASSWORD_RESET_ERROR', 'Password reset system error', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: 'Password reset failed. Please try again.'
      };
    }
  }

  private validatePasswordStrength(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) {
      return {
        valid: false,
        error: 'Password must be at least 8 characters long'
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one uppercase letter'
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one lowercase letter'
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one number'
      };
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one special character'
      };
    }

    return { valid: true };
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private generateToken(sessionData: SessionData): string {
    // Simple token generation - in production, use JWT or similar
    return btoa(JSON.stringify({
      userId: sessionData.userId,
      username: sessionData.username,
      role: sessionData.role,
      expiresAt: sessionData.expiresAt
    }));
  }

  private setSession(sessionData: SessionData): void {
    try {
      localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  private getSession(): SessionData | null {
    try {
      const sessionStr = localStorage.getItem(this.sessionKey);
      if (!sessionStr) return null;
      return JSON.parse(sessionStr);
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  private clearSession(): void {
    try {
      localStorage.removeItem(this.sessionKey);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  private getLoginAttempts(username: string): number {
    try {
      const attemptsStr = localStorage.getItem(`login_attempts_${username}`);
      if (!attemptsStr) return 0;
      const attempts = JSON.parse(attemptsStr);
      
      // Reset attempts after 15 minutes
      if (Date.now() - attempts.timestamp > 15 * 60 * 1000) {
        localStorage.removeItem(`login_attempts_${username}`);
        return 0;
      }
      
      return attempts.count;
    } catch (error) {
      return 0;
    }
  }

  private recordFailedAttempt(username: string): void {
    try {
      const attempts = this.getLoginAttempts(username);
      const newAttempts = {
        count: attempts + 1,
        timestamp: Date.now()
      };
      localStorage.setItem(`login_attempts_${username}`, JSON.stringify(newAttempts));
    } catch (error) {
      console.error('Failed to record login attempt:', error);
    }
  }

  private clearFailedAttempts(username: string): void {
    try {
      localStorage.removeItem(`login_attempts_${username}`);
    } catch (error) {
      console.error('Failed to clear login attempts:', error);
    }
  }

  // Auto-logout on inactivity
  startInactivityTimer(): void {
    const inactivityTimeout = 30 * 60 * 1000; // 30 minutes
    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        const session = this.getSession();
        if (session) {
          logger.logSecurity('AUTO_LOGOUT', 'User logged out due to inactivity', `${session.username} (${session.userId})`);
          this.clearSession();
          // Trigger logout event for UI
          window.dispatchEvent(new CustomEvent('user-logout'));
        }
      }, inactivityTimeout);
    };

    // Reset timer on user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    resetTimer();
  }

  async getLastLoginUsers(): Promise<any[]> {
    try {
      return await db.getLastLoginUsers(5);
    } catch (error) {
      console.error('Get last login users error:', error);
      return [];
    }
  }

  // Professional auto-login for operators only
  async enableRememberMe(userId: number, userRole: string, rememberDays: number = 30): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      // Only allow auto-login for operators (production users)
      if (userRole !== 'prod') {
        return { success: false, error: 'Auto-login is only available for operators' };
      }

      const token = this.generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + rememberDays);

      // Store in localStorage (device-specific)
      const rememberData = {
        userId,
        token,
        expiresAt: expiresAt.toISOString(),
        role: userRole
      };

      localStorage.setItem('spc-remember-me', JSON.stringify(rememberData));
      
      logger.logSecurity('REMEMBER_ME_ENABLED', 'Remember me enabled for operator', `User ID: ${userId}`);
      return { success: true, token };
    } catch (error) {
      console.error('Enable remember me error:', error);
      logger.logSecurity('REMEMBER_ME_ERROR', 'Remember me system error', error instanceof Error ? error.message : String(error));
      return { success: false, error: 'Remember me system error' };
    }
  }

  async checkRememberMe(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const rememberData = localStorage.getItem('spc-remember-me');
      if (!rememberData) {
        return { success: false, error: 'No remember me data found' };
      }

      const data = JSON.parse(rememberData);
      const expiresAt = new Date(data.expiresAt);

      // Check if token is expired
      if (expiresAt < new Date()) {
        localStorage.removeItem('spc-remember-me');
        return { success: false, error: 'Remember me token expired' };
      }

      // Get user from database
      const userData = await db.queryAll(`
        SELECT u.id, u.username, u.role, u.group_id, u.workstation_id, u.workshop_id,
               g.name as group_name, w.name as workstation_name, ws.name as workshop_name
        FROM users u
        LEFT JOIN groups g ON u.group_id = g.id
        LEFT JOIN workstations w ON u.workstation_id = w.id
        LEFT JOIN workshops ws ON u.workshop_id = ws.id
        WHERE u.id = ? AND u.status = 'active'
      `, [data.userId]);

      if (userData.length === 0) {
        localStorage.removeItem('spc-remember-me');
        return { success: false, error: 'User not found or inactive' };
      }

      const user = userData[0];

      // Verify this is still an operator
      if (user.role !== 'prod') {
        localStorage.removeItem('spc-remember-me');
        return { success: false, error: 'User role changed, auto-login disabled' };
      }

      // Create session
      const sessionData: SessionData = {
        userId: user.id,
        username: user.username,
        role: user.role,
        loginTime: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + this.sessionTimeout
      };

      this.setSession(sessionData);

      // Update last login
      await db.updateLastLogin(user.id);

      logger.logSecurity('AUTO_LOGIN_SUCCESS', 'Operator auto-logged in', `${user.username} (${user.role})`);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          group_id: user.group_id,
          group_name: user.group_name,
          workstation_id: user.workstation_id,
          workstation_name: user.workstation_name,
          workshop_id: user.workshop_id,
          workshop_name: user.workshop_name
        }
      };
    } catch (error) {
      console.error('Check remember me error:', error);
      localStorage.removeItem('spc-remember-me');
      logger.logSecurity('AUTO_LOGIN_ERROR', 'Remember me system error', error instanceof Error ? error.message : String(error));
      return { success: false, error: 'Remember me system error' };
    }
  }

  clearRememberMe(): void {
    localStorage.removeItem('spc-remember-me');
  }

  private generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export const authService = new AuthService();
