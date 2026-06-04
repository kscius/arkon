import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarInitials?: string;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ enum: Rol })
  role!: Rol;

  @ApiProperty()
  avatarInitials!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  municipioId?: string | null;

  @ApiPropertyOptional()
  contratistaId?: string | null;
}

export class TokenResponseDto {
  @ApiProperty()
  access_token!: string;

  @ApiProperty()
  token_type!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
