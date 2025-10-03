import { db } from './database';
import { encryption } from './encryption';
import { logger } from './logger';

export interface RegistrationCode {
  id: number;
  code: string;
  role: string;
  workshop_id?: number;
  workstation_id?: number;
  group_id?: number;
  created_by: number;
  expires_at?: string;
  used_at?: string;
  used_by?: number;
  created_at: string;
}

export interface UserValidationRequest {
  id: number;
  registration_code: string;
  username: string;
  requested_role: string;
  requested_workshop_id?: number;
  requested_workstation_id?: number;
  requested_group_id?: number;
  status: 'pending' | 'approved' | 'rejected';
  validated_by?: number;
  validated_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface RegistrationRequest {
  registrationCode: string;
  username: string;
  password?: string;
  requestedWorkshopId?: number;
  requestedWorkstationId?: number;
  requestedGroupId?: number;
}

export interface RegistrationResult {
  success: boolean;
  message: string;
  validationRequestId?: number;
  error?: string;
}

export interface NotificationData {
  id: number;
  type: string;
  title: string;
  message: string;
  user_id?: number;
  read_at?: string;
  created_at: string;
}

class RegistrationService {
  // Generate a registration code (format: 2 letters + 6 numbers)
  generateRegistrationCode(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let code = '';
    // Add 2 random letters
    for (let i = 0; i < 2; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    // Add 6 random numbers
    for (let i = 0; i < 6; i++) {
      code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    return code;
  }

  // Create a new registration code
  async createRegistrationCode(
    role: string,
    createdBy: number,
    workshopId?: number,
    workstationId?: number,
    groupId?: number,
    expiresInHours: number = 24
  ): Promise<{ success: boolean; code?: string; error?: string }> {
    try {
      // Database is initialized globally in App.tsx

      // Generate unique code
      let code: string;
      let attempts = 0;
      do {
        code = this.generateRegistrationCode();
        const existing = await db.queryAll(
          'SELECT id FROM registration_codes WHERE code = ?',
          [code]
        );
        if (existing.length === 0) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        return {
          success: false,
          error: 'Failed to generate unique registration code'
        };
      }

      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      // Insert registration code
      await db.execute(`
        INSERT INTO registration_codes 
        (code, role, workshop_id, workstation_id, group_id, created_by, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [code, role, workshopId || null, workstationId || null, groupId || null, createdBy, expiresAt.toISOString()]);

      // Database automatically saved in Electron mode

      logger.logSecurity('REGISTRATION_CODE_CREATED', 'Registration code created', `${code} (${role})`);

      return { success: true, code };

    } catch (error) {
      console.error('Create registration code error:', error);
      logger.logSecurity('REGISTRATION_CODE_ERROR', 'Registration code creation error', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: 'Failed to create registration code'
      };
    }
  }

  // Validate a registration code
  async validateRegistrationCode(code: string): Promise<{
    success: boolean;
    data?: RegistrationCode;
    error?: string;
  }> {
    try {
      // Database is initialized globally in App.tsx

      const result = await db.queryAll(`
        SELECT rc.*, 
               ws.name as workshop_name,
               w.name as workstation_name,
               g.name as group_name
        FROM registration_codes rc
        LEFT JOIN workshops ws ON rc.workshop_id = ws.id
        LEFT JOIN workstations w ON rc.workstation_id = w.id
        LEFT JOIN groups g ON rc.group_id = g.id
        WHERE rc.code = ? AND rc.used_at IS NULL
      `, [code]);

      if (result.length === 0) {
        return {
          success: false,
          error: 'Invalid or already used registration code'
        };
      }

      const registrationCode = result[0];

      // Check if code is expired
      if (registrationCode.expires_at) {
        const expiresAt = new Date(registrationCode.expires_at);
        if (expiresAt < new Date()) {
          return {
            success: false,
            error: 'Registration code has expired'
          };
        }
      }

      return { success: true, data: registrationCode };

    } catch (error) {
      console.error('Validate registration code error:', error);
      return {
        success: false,
        error: 'Failed to validate registration code'
      };
    }
  }

  // Submit a registration request
  async submitRegistrationRequest(request: RegistrationRequest): Promise<RegistrationResult> {
    try {
      // Database is initialized globally in App.tsx

      // Validate registration code
      const codeValidation = await this.validateRegistrationCode(request.registrationCode);
      if (!codeValidation.success) {
        return {
          success: false,
          message: codeValidation.error || 'Invalid registration code'
        };
      }

      const registrationCode = codeValidation.data!;

      // Check if username already exists
      const existingUser = await db.queryAll(
        'SELECT id FROM users WHERE username = ?',
        [request.username]
      );

      if (existingUser.length > 0) {
        return {
          success: false,
          message: 'Username already exists'
        };
      }

      // Check if there's already a pending request for this username
      const existingRequest = await db.queryAll(
        'SELECT id FROM user_validation_requests WHERE username = ? AND status = "pending"',
        [request.username]
      );

      if (existingRequest.length > 0) {
        return {
          success: false,
          message: 'Registration request already pending for this username'
        };
      }

      // Create validation request
      const validationRequestId = await db.execute(`
        INSERT INTO user_validation_requests 
        (registration_code, username, requested_role, requested_workshop_id, requested_workstation_id, requested_group_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        request.registrationCode,
        request.username,
        registrationCode.role,
        request.requestedWorkshopId || null,
        request.requestedWorkstationId || null,
        registrationCode.group_id
      ]);

      // Create notifications for admins and method users
      await this.createRegistrationNotifications(validationRequestId, request.username, registrationCode);

      logger.logSecurity('REGISTRATION_REQUEST_SUBMITTED', 'Registration request submitted', `${request.username} (${registrationCode.role})`);

      return {
        success: true,
        message: 'Registration request submitted successfully. Please wait for approval.',
        validationRequestId
      };

    } catch (error) {
      console.error('Submit registration request error:', error);
      logger.logSecurity('REGISTRATION_REQUEST_ERROR', 'Registration request error', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        message: 'Failed to submit registration request'
      };
    }
  }

  // Create notifications for new registration requests
  async createRegistrationNotifications(
    _validationRequestId: number,
    username: string,
    registrationCode: RegistrationCode
  ): Promise<void> {
    try {
      // Get all admins
      const admins = await db.queryAll('SELECT id FROM users WHERE role = "admin"');
      
      // Get method users for the specific workshop (if applicable)
      let methodUsers: any[] = [];
      if (registrationCode.workshop_id) {
        methodUsers = await db.queryAll(`
          SELECT DISTINCT u.id 
          FROM users u
          JOIN workshop_methods wm ON u.id = wm.user_id
          WHERE u.role = 'method' AND wm.workshop_id = ?
        `, [registrationCode.workshop_id]);
      }

      const notificationTitle = 'New User Registration Request';
      const notificationMessage = `User "${username}" has requested registration with role "${registrationCode.role}".`;

      // Create notifications for admins
      for (const admin of admins) {
        await db.execute(`
          INSERT INTO notifications (type, title, message, user_id)
          VALUES (?, ?, ?, ?)
        `, ['registration_request', notificationTitle, notificationMessage, admin.id]);
      }

      // Create notifications for method users
      for (const methodUser of methodUsers) {
        await db.execute(`
          INSERT INTO notifications (type, title, message, user_id)
          VALUES (?, ?, ?, ?)
        `, ['registration_request', notificationTitle, notificationMessage, methodUser.id]);
      }

      // Database automatically saved in Electron mode

    } catch (error) {
      console.error('Create registration notifications error:', error);
    }
  }

  // Approve a registration request
  async approveRegistrationRequest(
    validationRequestId: number,
    approvedBy: number,
    password?: string,
    workshopId?: number,
    workstationId?: number,
    groupId?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Database is initialized globally in App.tsx

      // Get the validation request
      const request = await db.queryAll(`
        SELECT * FROM user_validation_requests WHERE id = ? AND status = 'pending'
      `, [validationRequestId]);

      if (request.length === 0) {
        return {
          success: false,
          error: 'Validation request not found or already processed'
        };
      }

      const validationRequest = request[0];

      // Check if username still available
      const existingUser = await db.queryAll(
        'SELECT id FROM users WHERE username = ?',
        [validationRequest.username]
      );

      if (existingUser.length > 0) {
        return {
          success: false,
          error: 'Username already exists'
        };
      }

      // Generate password if not provided (for prod users)
      const finalPassword = password || this.generateTemporaryPassword();
      const passwordHash = encryption.hashPassword(finalPassword);

      // Create the user with provided details (or fallback to original request)
      await db.execute(`
        INSERT INTO users 
        (username, password_hash, role, workstation_id, workshop_id, group_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'active')
      `, [
        validationRequest.username,
        passwordHash,
        validationRequest.requested_role,
        workstationId || validationRequest.requested_workstation_id,
        workshopId || validationRequest.requested_workshop_id,
        groupId || validationRequest.requested_group_id
      ]);

      // Mark registration code as used
      await db.execute(`
        UPDATE registration_codes 
        SET used_at = CURRENT_TIMESTAMP, used_by = ?
        WHERE code = ?
      `, [validationRequestId, validationRequest.registration_code]);

      // Update validation request
      await db.execute(`
        UPDATE user_validation_requests 
        SET status = 'approved', validated_by = ?, validated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [approvedBy, validationRequestId]);

      // Create success notification for the user
      await db.execute(`
        INSERT INTO notifications (type, title, message, user_id)
        VALUES (?, ?, ?, ?)
      `, [
        'registration_approved',
        'Registration Approved',
        'Your registration has been approved. You can now log in.',
        validationRequestId // This will be updated with actual user ID
      ]);

      // Database automatically saved in Electron mode

      logger.logSecurity('REGISTRATION_APPROVED', 'Registration request approved', `${validationRequest.username} by ${approvedBy}`);

      return { success: true };

    } catch (error) {
      console.error('Approve registration request error:', error);
      logger.logSecurity('REGISTRATION_APPROVAL_ERROR', 'Registration approval error', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: 'Failed to approve registration request'
      };
    }
  }

  // Reject a registration request
  async rejectRegistrationRequest(
    validationRequestId: number,
    rejectedBy: number,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Database is initialized globally in App.tsx

      // Update validation request
      await db.execute(`
        UPDATE user_validation_requests 
        SET status = 'rejected', validated_by = ?, validated_at = CURRENT_TIMESTAMP, rejection_reason = ?
        WHERE id = ?
      `, [rejectedBy, reason, validationRequestId]);

      // Database automatically saved in Electron mode

      logger.logSecurity('REGISTRATION_REJECTED', 'Registration request rejected', `${validationRequestId} by ${rejectedBy}: ${reason}`);

      return { success: true };

    } catch (error) {
      console.error('Reject registration request error:', error);
      logger.logSecurity('REGISTRATION_REJECTION_ERROR', 'Registration rejection error', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: 'Failed to reject registration request'
      };
    }
  }

  // Get pending validation requests
  async getPendingValidationRequests(): Promise<UserValidationRequest[]> {
    try {
      // Database is initialized globally in App.tsx

      const requests = await db.queryAll(`
        SELECT uvr.*,
               ws.name as workshop_name,
               w.name as workstation_name,
               g.name as group_name,
               validator.username as validated_by_username
        FROM user_validation_requests uvr
        LEFT JOIN workshops ws ON uvr.requested_workshop_id = ws.id
        LEFT JOIN workstations w ON uvr.requested_workstation_id = w.id
        LEFT JOIN groups g ON uvr.requested_group_id = g.id
        LEFT JOIN users validator ON uvr.validated_by = validator.id
        WHERE uvr.status = 'pending'
        ORDER BY uvr.created_at DESC
      `);

      return requests;

    } catch (error) {
      console.error('Get pending validation requests error:', error);
      return [];
    }
  }

  // Get user notifications
  async getUserNotifications(userId: number): Promise<NotificationData[]> {
    try {
      // Database is initialized globally in App.tsx

      const notifications = await db.queryAll(`
        SELECT * FROM notifications 
        WHERE user_id = ? OR user_id IS NULL
        ORDER BY created_at DESC
        LIMIT 50
      `, [userId]);

      return notifications;

    } catch (error) {
      console.error('Get user notifications error:', error);
      return [];
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: number): Promise<void> {
    try {
      // Database is initialized globally in App.tsx

      await db.execute(`
        UPDATE notifications 
        SET read_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [notificationId]);

      // Database automatically saved in Electron mode

    } catch (error) {
      console.error('Mark notification as read error:', error);
    }
  }

  // Generate temporary password
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

export const registrationService = new RegistrationService();
