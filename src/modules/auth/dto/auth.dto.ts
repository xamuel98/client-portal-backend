import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Sweeft Events' })
  @IsNotEmpty()
  @IsString()
  tenantName: string;

  @ApiProperty({ example: 'Solomon' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Falana' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'solomon@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '+2348100673347', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class InitiateRegisterDto {
  @ApiProperty({ example: 'solomon@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class VerifyRegisterDto {
  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class CompleteRegisterDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'Sweeft Events' })
  @IsNotEmpty()
  @IsString()
  tenantName: string;

  @ApiProperty({ example: 'Solomon' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Falana' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '+2348100673347', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'solomon@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'solomon@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'solomon@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'reset-token-123' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewStrongPass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
