import {
  Body,
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './services/auth.service';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  InitiateRegisterDto,
  VerifyRegisterDto,
  CompleteRegisterDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/initiate')
  @ApiOperation({
    summary: 'Initiate registration by sending verification email',
  })
  async initiateRegister(@Body() dto: InitiateRegisterDto) {
    return this.authService.initiateRegistration(dto);
  }

  @Post('register/verify')
  @ApiOperation({ summary: 'Verify email token' })
  @HttpCode(HttpStatus.OK)
  async verifyRegister(@Body() dto: VerifyRegisterDto) {
    return this.authService.verifyRegistrationToken(dto);
  }

  @Post('register/complete')
  @ApiOperation({ summary: 'Complete registration with user details' })
  async completeRegister(@Body() dto: CompleteRegisterDto) {
    return this.authService.completeRegistration(dto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new tenant and owner (Deprecated)' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token from email' })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Login with Google' })
  async googleLogin(@Req() req: any) {
    // Guards handles redirect
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google auth callback' })
  async googleCallback(@Req() req: any) {
    return this.authService.validateGoogleUser(req.user);
  }
}
