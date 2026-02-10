import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Redis } from 'ioredis';
import { EmailService } from '../../email/email.service';
import { UsersRepository } from '../../users/repositories/users.repository';
import { TenantsRepository } from '../../tenants/repositories/tenants.repository';
import { TokenService } from './token.service';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  InitiateRegisterDto,
  VerifyRegisterDto,
  CompleteRegisterDto,
} from '../dto/auth.dto';
import { UserRole } from '../../../common/constants/roles.constant';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../../common/constants/subscription-plans.constant';
import { Tenant } from '../../tenants/schemas/tenant.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly tenantsRepository: TenantsRepository,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async initiateRegistration(dto: InitiateRegisterDto) {
    const { email } = dto;

    // 1. Check if user already exists
    const existingUser = await this.usersRepository.findByEmailGlobal(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // 2. Generate Verification Token
    const token = crypto.randomBytes(32).toString('hex');
    const key = `auth:register:${token}`;

    // 3. Store in Redis with TTL (e.g., 1 hour)
    await this.redis.set(key, email, 'EX', 3600);

    // 4. Send Email
    await this.emailService.sendVerificationEmail(email, token);

    return { message: 'Verification email sent' };
  }

  async verifyRegistrationToken(dto: VerifyRegisterDto) {
    const { token } = dto;
    const key = `auth:register:${token}`;

    const email = await this.redis.get(key);
    if (!email) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Return the token itself as a "setup token" or sign a temporary JWT
    // For simplicity, we can just return the same token if we trust the client to pass it back
    // But better to return a signed JWT payload
    const tempToken = await this.tokenService.generateTemporaryToken({ email });

    return {
      message: 'Email verified',
      tempToken,
      email,
    };
  }

  async completeRegistration(dto: CompleteRegisterDto) {
    const { token, tenantName, firstName, lastName, password, phone } = dto;

    // 1. Verify Temp Token
    const payload = await this.tokenService.verifyTemporaryToken(token);
    const email = payload.email;

    // 2. Double check user doesn't exist (race condition)
    const existingUser = await this.usersRepository.findByEmailGlobal(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // 3. Create Tenant
    const slug = this.generateSlug(tenantName);
    // Simple slug collision check
    let uniqueSlug = slug;
    let counter = 1;
    while (await this.tenantsRepository.findBySlug(uniqueSlug)) {
      uniqueSlug = `${slug}-${counter++}`;
    }

    const tenant = await this.tenantsRepository.create({
      name: tenantName,
      slug: uniqueSlug,
      subscription: {
        plan: SubscriptionPlan.TRIAL,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
      },
      phone,
    } as Partial<Tenant>);

    // 4. Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersRepository.create({
      tenantId: tenant._id,
      email,
      passwordHash: hashedPassword,
      firstName,
      lastName,
      role: UserRole.OWNER,
      profile: {
        firstName,
        lastName,
        phone,
      },
      permissions: [],
      emailVerified: true, // They just verified it
      isActive: true,
    } as any);

    // 5. Generate Final Tokens
    return this.tokenService.generateTokens(user);
  }

  // Kept for backward compatibility if needed, but likely deprecated
  async register(registerDto: RegisterDto) {
    return this.completeRegistration({
      ...registerDto,
      token: await this.tokenService.generateTemporaryToken({
        email: registerDto.email,
      }), // Mock token
    });
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find custom by Global email lookup
    const user = await this.usersRepository.findByEmailGlobal(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash!);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Update last login
    await this.usersRepository.update(user._id.toString(), {
      lastLoginAt: new Date(),
    } as any);

    return this.tokenService.generateTokens(user);
  }

  async validateGoogleUser(profile: any) {
    const { googleId, email, firstName, lastName, picture } = profile;

    // 1. Find user by googleId
    let user = await this.usersRepository.findOne({ googleId });

    if (!user) {
      // 2. Find user by email (existing local user linking Google)
      user = await this.usersRepository.findByEmailGlobal(email);

      if (user) {
        // Link Google ID to existing user
        user = (await this.usersRepository.update(user._id.toString(), {
          googleId,
          'profile.avatar': picture, // Optional: update avatar
        } as any)) as any;
      } else {
        // NEW USER via Google -> Return Temp Token to complete setup
        const tempToken = await this.tokenService.generateTemporaryToken({
          email,
          googleId,
          firstName,
          lastName,
          picture,
        });

        // We verify this logic in the controller redirect
        return {
          isNewUser: true,
          tempToken,
          email,
          firstName,
          lastName,
          picture,
        };
      }
    }

    // Update last login
    await this.usersRepository.update(user!._id.toString(), {
      lastLoginAt: new Date(),
    } as any);

    return this.tokenService.generateTokens(user!);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersRepository.findByEmailGlobal(
      forgotPasswordDto.email,
    );
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(token, 10);

    user.passwordResetToken = hash;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await this.usersRepository.update(user._id.toString(), {
      passwordResetToken: hash,
      passwordResetExpires: user.passwordResetExpires,
    } as any);

    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.profile.firstName,
      token,
    );
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const user = await this.usersRepository.findByEmailGlobal(
      resetPasswordDto.email,
    );

    if (!user || !user.passwordResetToken || !user.passwordResetExpires) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Token expired');
    }

    const isMatch = await bcrypt.compare(
      resetPasswordDto.token,
      user.passwordResetToken,
    );
    if (!isMatch) {
      throw new BadRequestException('Invalid token');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    await this.usersRepository.update(user._id.toString(), {
      passwordHash: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    } as any);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
}
